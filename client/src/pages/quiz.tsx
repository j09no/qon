import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Timer } from "@/components/ui/timer";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Brain, 
  SkipForward, 
  Flag,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Trophy
} from "lucide-react";
import { useTimer } from "@/hooks/use-timer";
import { calculateQuizScore, calculateQuestionScore, NEET_SCORING } from "@/lib/quiz-scoring";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Question } from "@shared/schema";

export default function Quiz() {
  const { toast } = useToast();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: string }>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  const [showResults, setShowResults] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);

  const { timeRemaining: timeLeft, start: startTimer, pause: pauseTimer, reset: resetTimer } = useTimer(30 * 60); // 30 minutes

  // Get chapters for selection
  const { data: chapters } = useQuery({
    queryKey: ["/api/chapters"],
  });

  // Get questions for selected chapter
  const { data: chapterQuestions, isLoading: questionsLoading } = useQuery({
    queryKey: [`/api/questions/chapter/${selectedChapter}`],
    enabled: !!selectedChapter,
  });

  useEffect(() => {
    if (chapterQuestions && chapterQuestions.length > 0) {
      setQuestions(chapterQuestions);
      setCurrentQuestionIndex(0);
      setSelectedAnswers({});
      setFlaggedQuestions(new Set());
      setShowResults(false);
      setReviewMode(false);
    } else if (chapterQuestions && chapterQuestions.length === 0) {
      toast({
        title: "No Questions Available",
        description: "This chapter doesn't have any questions yet. Please upload some questions first.",
        variant: "destructive",
      });
    }
  }, [chapterQuestions, toast]);

  // Check for subtopic quiz data
  useEffect(() => {
    const subtopicQuizData = localStorage.getItem('currentSubtopicQuiz');
    if (subtopicQuizData) {
      const { subtopicId, subtopicTitle, chapterId, questions: subtopicQuestions } = JSON.parse(subtopicQuizData);
      setSelectedChapter(chapterId);
      setQuestions(subtopicQuestions);
      setCurrentQuestionIndex(0);
      setSelectedAnswers({});
      setFlaggedQuestions(new Set());
      setShowResults(false);
      setReviewMode(false);
      // Clear the data after using it
      localStorage.removeItem('currentSubtopicQuiz');
    }
  }, []);

  // Show chapter selection if no chapter is selected
  if (!selectedChapter || questions.length === 0) {
    return (
      <section className="mb-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">Select Chapter for Quiz</h1>
            <p className="text-gray-400 mb-8">Choose a chapter to start practicing questions</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {chapters?.map((chapter) => (
              <Card 
                key={chapter.id} 
                className="glass-morphism hover:bg-opacity-20 transition-all duration-300 cursor-pointer"
                onClick={() => setSelectedChapter(chapter.id)}
              >
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-2">{chapter.title}</h3>
                  <p className="text-gray-400 text-sm mb-4">{chapter.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-400">
                      {chapter.totalQuestions} Questions
                    </span>
                    <Button 
                      className="bg-blue-600 hover:bg-blue-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedChapter(chapter.id);
                      }}
                    >
                      Start Quiz
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {questionsLoading && selectedChapter && (
            <div className="text-center mt-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="text-gray-400 mt-2">Loading questions...</p>
            </div>
          )}
        </div>
      </section>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;

  const handleAnswerSelect = (answer) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQuestionIndex]: answer,
    }));
  };

  const handleFlagQuestion = () => {
    setFlaggedQuestions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(currentQuestionIndex)) {
        newSet.delete(currentQuestionIndex);
      } else {
        newSet.add(currentQuestionIndex);
      }
      return newSet;
    });
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleStartQuiz = () => {
    setQuizStarted(true);
    startTimer();
  };

  const handleEndQuiz = () => {
    setShowResults(true);
    pauseTimer();
  };

  const handleRestart = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setFlaggedQuestions(new Set());
    setShowResults(false);
    setQuizStarted(false);
    setReviewMode(false);
    resetTimer();
  };

  const handleBackToChapters = () => {
    setSelectedChapter(null);
    setQuestions([]);
    handleRestart();
  };

  const toggleReviewMode = () => {
    setReviewMode((prev) => !prev);
  };

  const calculateResults = () => {
    let correct = 0;
    let incorrect = 0;
    let unanswered = 0;

    questions.forEach((question, index) => {
      const userAnswer = selectedAnswers[index];
      if (!userAnswer) {
        unanswered++;
      } else if (userAnswer === question.correctAnswer) {
        correct++;
      } else {
        incorrect++;
      }
    });

    return { correct, incorrect, unanswered };
  };

  const { correct, incorrect, unanswered } = calculateResults();

  return (
    <section className="mb-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToChapters}
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Chapters
          </Button>
          <div className="flex items-center space-x-2">
            <Brain className="w-6 h-6 text-blue-400" />
            <h1 className="text-2xl font-bold">NEET Quiz - {chapters?.find(c => c.id === selectedChapter)?.title}</h1>
          </div>

          {!quizStarted && (
            <Button className="bg-green-600 hover:bg-green-500" onClick={handleStartQuiz}>
              <Brain className="w-4 h-4 mr-2" />
              Start Quiz
            </Button>
          )}
        </div>

        {quizStarted && !showResults ? (
          <>
            <Card className="glass-morphism mb-6">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-gray-400">
                      Question {currentQuestionIndex + 1} of {totalQuestions}
                    </div>
                    <Progress value={((currentQuestionIndex + 1) / totalQuestions) * 100} className="w-32" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-orange-400" />
                    <Timer 
                      initialTime={timeLeft}
                      onTimeUp={handleEndQuiz}
                      isRunning={quizStarted && !showResults}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-4 text-xs">
                  <span className="text-green-400">{correct} Correct</span>
                  <span className="text-red-400">{incorrect} Incorrect</span>
                  <span className="text-gray-400">{unanswered} Unanswered</span>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-morphism">
              <CardContent className="p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-4">Question {currentQuestionIndex + 1} of {totalQuestions}</h2>
                  <p className="text-gray-300 text-lg leading-relaxed">{currentQuestion.question}</p>
                </div>

                <div className="space-y-3 mb-6">
                  {[
                    { key: 'A', value: currentQuestion.optionA },
                    { key: 'B', value: currentQuestion.optionB },
                    { key: 'C', value: currentQuestion.optionC },
                    { key: 'D', value: currentQuestion.optionD }
                  ].map((option) => {
                    const isSelected = selectedAnswers[currentQuestionIndex] === option.value;
                    const isCorrect = reviewMode && option.value === currentQuestion.correctAnswer;
                    const isWrong = reviewMode && isSelected && option.value !== currentQuestion.correctAnswer;

                    return (
                      <button
                        key={option.key}
                        onClick={() => handleAnswerSelect(option.value)}
                        disabled={reviewMode}
                        className={cn(
                          "w-full p-4 text-left rounded-lg border transition-all duration-200",
                          "hover:border-blue-500 hover:bg-blue-500/10",
                          isSelected && !reviewMode && "border-blue-500 bg-blue-500/20",
                          isCorrect && "border-green-500 bg-green-500/20",
                          isWrong && "border-red-500 bg-red-500/20",
                          reviewMode && !isSelected && !isCorrect && !isWrong && "opacity-50"
                        )}
                      >
                        <div className="flex items-center space-x-3">
                          <span className={cn(
                            "w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium",
                            isSelected && !reviewMode && "border-blue-500 bg-blue-500 text-white",
                            isCorrect && "border-green-500 bg-green-500 text-white",
                            isWrong && "border-red-500 bg-red-500 text-white",
                            !isSelected && !isCorrect && !isWrong && "border-gray-600"
                          )}>
                            {option.key}
                          </span>
                          <span className="flex-1">{option.value}</span>
                          {reviewMode && isCorrect && <CheckCircle className="w-5 h-5 text-green-500" />}
                          {reviewMode && isWrong && <XCircle className="w-5 h-5 text-red-500" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Explanation in review mode */}
                {reviewMode && currentQuestion.explanation && (
                  <div className="mb-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                    <h4 className="font-semibold text-blue-300 mb-2">Explanation:</h4>
                    <p className="text-gray-300">{currentQuestion.explanation}</p>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreviousQuestion}
                      disabled={currentQuestionIndex === 0}
                      className="bg-gray-800 hover:bg-gray-700"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextQuestion}
                      disabled={currentQuestionIndex === totalQuestions - 1}
                      className="bg-gray-800 hover:bg-gray-700"
                    >
                      Next
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>

                  <div className="flex items-center space-x-4">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleFlagQuestion}
                      className={cn("bg-gray-800 hover:bg-gray-700", flaggedQuestions.has(currentQuestionIndex) && "bg-yellow-600 hover:bg-yellow-500")}
                    >
                      <Flag className="w-4 h-4 mr-2" />
                      {flaggedQuestions.has(currentQuestionIndex) ? "Unflag" : "Flag"}
                    </Button>
                    <Button className="bg-red-600 hover:bg-red-500" onClick={handleEndQuiz}>
                      <XCircle className="w-4 h-4 mr-2" />
                      End Quiz
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : quizStarted && showResults ? (
          <Card className="glass-morphism">
            <CardContent className="p-6">
              <div className="text-center mb-8">
                <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                <h2 className="text-3xl font-bold mb-4">Quiz Completed!</h2>
                <p className="text-gray-300">Here are your results:</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <Badge variant="secondary">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-400" />
                  Correct: {correct}
                </Badge>
                <Badge variant="secondary">
                  <XCircle className="w-4 h-4 mr-2 text-red-400" />
                  Incorrect: {incorrect}
                </Badge>
                <Badge variant="secondary">
                  <Clock className="w-4 h-4 mr-2 text-gray-400" />
                  Unanswered: {unanswered}
                </Badge>
                <Badge variant="secondary">
                  <Brain className="w-4 h-4 mr-2 text-blue-400" />
                  Score: {(correct * NEET_SCORING.CORRECT) + (incorrect * NEET_SCORING.INCORRECT)}
                </Badge>
                <Badge variant="secondary">
                  <SkipForward className="w-4 h-4 mr-2 text-purple-400" />
                  Completion Time: {30 * 60 - timeLeft} seconds
                </Badge>
                <Badge variant="secondary">
                  <Flag className="w-4 h-4 mr-2 text-yellow-400" />
                  Flagged Questions: {flaggedQuestions.size}
                </Badge>
              </div>

              <div className="flex justify-center space-x-4">
                <Button className="bg-blue-600 hover:bg-blue-500" onClick={toggleReviewMode}>
                  {reviewMode ? "Hide Review" : "Review Answers"}
                </Button>
                <Button variant="outline" className="bg-gray-800 hover:bg-gray-700" onClick={handleRestart}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restart Quiz
                </Button>
                <Button className="bg-green-600 hover:bg-green-500" onClick={handleBackToChapters}>
                  Back to Chapters
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </section>
  );
}