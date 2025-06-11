import {
  subjects, chapters, questions, quizSessions, quizAnswers, studySessions, userStats, scheduleEvents,
  type Subject, type Chapter, type Question, type QuizSession, type QuizAnswer, 
  type StudySession, type UserStats, type ScheduleEvent,
  type InsertSubject, type InsertChapter, type InsertQuestion, type InsertQuizSession,
  type InsertQuizAnswer, type InsertStudySession, type InsertScheduleEvent
} from "@shared/schema";
import { supabase, type SupabaseSubtopic, type SupabaseQuestion, type SupabaseMessage, type SupabaseFile, type SupabaseFolder } from "./supabase";
import * as fs from 'fs';
import * as path from 'path';

interface IStorage {
  // Subjects
  getSubjects(): Promise<Subject[]>;
  createSubject(subject: InsertSubject): Promise<Subject>;

  // Chapters
  getChapters(): Promise<Chapter[]>;
  getChaptersBySubject(subjectId: number): Promise<Chapter[]>;
  getChapter(id: number): Promise<Chapter | undefined>;
  createChapter(chapter: InsertChapter): Promise<Chapter>;
  updateChapter(id: number, chapter: Partial<InsertChapter>): Promise<Chapter | undefined>;
  deleteChapter(id: number): Promise<boolean>;

  // Questions
  getQuestionsByChapter(chapterId: number): Promise<Question[]>;
  getQuestionsBySubtopic(subtopicId: number): Promise<Question[]>;
  getQuestion(id: number): Promise<Question | undefined>;
  createQuestion(question: InsertQuestion): Promise<Question>;
  createBulkQuestions(questions: InsertQuestion[]): Promise<Question[]>;

  // Subtopics
  getSubtopicsByChapter(chapterId: number): Promise<any[]>;
  createSubtopic(subtopic: any): Promise<any>;
  deleteSubtopic(id: number): Promise<boolean>;

  // Messages
  getMessages(): Promise<any[]>;
  createMessage(message: any): Promise<any>;

  // Files & Folders
  getFiles(): Promise<any[]>;
  getFolders(): Promise<any[]>;
  createFile(file: any): Promise<any>;
  createFolder(folder: any): Promise<any>;
  deleteFile(id: number): Promise<boolean>;
  deleteFolder(id: number): Promise<boolean>;

  // Quiz Sessions
  createQuizSession(session: InsertQuizSession): Promise<QuizSession>;
  getQuizSession(id: number): Promise<QuizSession | undefined>;
  updateQuizSession(id: number, session: Partial<QuizSession>): Promise<QuizSession | undefined>;

  // Quiz Answers
  createQuizAnswer(answer: InsertQuizAnswer): Promise<QuizAnswer>;
  getQuizAnswersBySession(sessionId: number): Promise<QuizAnswer[]>;

  // Study Sessions
  createStudySession(session: InsertStudySession): Promise<StudySession>;
  getStudySessionsByChapter(chapterId: number): Promise<StudySession[]>;

  // User Stats
  getUserStats(): Promise<UserStats>;
  updateUserStats(stats: Partial<UserStats>): Promise<UserStats>;

  // Schedule Events
  getScheduleEvents(): Promise<ScheduleEvent[]>;
  createScheduleEvent(event: InsertScheduleEvent): Promise<ScheduleEvent>;
  updateScheduleEvent(id: number, event: Partial<InsertScheduleEvent>): Promise<ScheduleEvent | undefined>;
  deleteScheduleEvent(id: number): Promise<boolean>;

  // Bulk operations
  createBulkQuestions(questions: InsertQuestion[]): Promise<Question[]>;
}

export class SupabaseStorage implements IStorage {
  private subjects: Map<number, Subject> = new Map();
  private chapters: Map<number, Chapter> = new Map();
  private questions: Map<number, Question> = new Map();
  private quizSessions: Map<number, QuizSession> = new Map();
  private quizAnswers: Map<number, QuizAnswer> = new Map();
  private studySessions: Map<number, StudySession> = new Map();
  private userStatsData: UserStats = {
    id: 1,
    totalQuestionsSolved: 1247,
    totalCorrectAnswers: 1085,
    studyStreak: 12,
    lastStudyDate: new Date(),
    totalStudyTimeMinutes: 1260,
  };
  private scheduleEvents: Map<number, ScheduleEvent> = new Map();

  private subtopics: Map<number, any> = new Map();
  private subjectIdCounter = 1;
  private chapterIdCounter = 1;
  private questionIdCounter = 1;
  private sessionIdCounter = 1;
  private answerIdCounter = 1;
  private studySessionIdCounter = 1;
  private eventIdCounter = 1;
  private subtopicIdCounter = 1;

  constructor() {
    this.loadPersistedData(); // Load first
    this.initializeDefaultData(); // Then add defaults if needed
    this.loadFromSupabase();
  }

  private initializeDefaultData() {
    // Only add default subjects if none exist
    if (this.subjects.size === 0) {
      const physics: Subject = { id: 1, name: "Physics", color: "blue" };
      const chemistry: Subject = { id: 2, name: "Chemistry", color: "green" };
      const biology: Subject = { id: 3, name: "Biology", color: "purple" };

      this.subjects.set(1, physics);
      this.subjects.set(2, chemistry);
      this.subjects.set(3, biology);
      this.subjectIdCounter = 4;
    }

    // Only add sample chapters if none exist
    if (this.chapters.size === 0) {
      const sampleChapters: Chapter[] = [
        { id: 1, title: "Mechanics", description: "Laws of motion and forces", subjectId: 1, totalQuestions: 0, completedQuestions: 0, createdAt: new Date() },
        { id: 2, title: "Thermodynamics", description: "Heat and energy transfer", subjectId: 1, totalQuestions: 0, completedQuestions: 0, createdAt: new Date() },
        { id: 3, title: "Atomic Structure", description: "Structure of atoms and molecules", subjectId: 2, totalQuestions: 0, completedQuestions: 0, createdAt: new Date() },
        { id: 4, title: "Chemical Bonding", description: "Types of chemical bonds", subjectId: 2, totalQuestions: 0, completedQuestions: 0, createdAt: new Date() },
        { id: 5, title: "Cell Biology", description: "Structure and function of cells", subjectId: 3, totalQuestions: 0, completedQuestions: 0, createdAt: new Date() },
        { id: 6, title: "Genetics", description: "Heredity and genetic variation", subjectId: 3, totalQuestions: 0, completedQuestions: 0, createdAt: new Date() },
      ];

      sampleChapters.forEach(chapter => {
        this.chapters.set(chapter.id, chapter);
      });
      this.chapterIdCounter = 7;
    }
  }

  private loadPersistedData() {
    try {
      const dataPath = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataPath)) {
        fs.mkdirSync(dataPath, { recursive: true });
      }

      // Load subjects
      const subjectsFile = path.join(dataPath, 'subjects.json');
      if (fs.existsSync(subjectsFile)) {
        const subjectsData = JSON.parse(fs.readFileSync(subjectsFile, 'utf8'));
        subjectsData.forEach((subject: Subject) => {
          this.subjects.set(subject.id, subject);
          if (subject.id >= this.subjectIdCounter) {
            this.subjectIdCounter = subject.id + 1;
          }
        });
      }

      // Load chapters
      const chaptersFile = path.join(dataPath, 'chapters.json');
      if (fs.existsSync(chaptersFile)) {
        const chaptersData = JSON.parse(fs.readFileSync(chaptersFile, 'utf8'));
        chaptersData.forEach((chapter: Chapter) => {
          chapter.createdAt = new Date(chapter.createdAt);
          this.chapters.set(chapter.id, chapter);
          if (chapter.id >= this.chapterIdCounter) {
            this.chapterIdCounter = chapter.id + 1;
          }
        });
      }
    } catch (error) {
      console.log('No persisted data found or error loading, using defaults');
    }
  }

  private async persistData() {
    try {
      const dataPath = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataPath)) {
        fs.mkdirSync(dataPath, { recursive: true });
      }

      // Save subjects
      const subjectsFile = path.join(dataPath, 'subjects.json');
      const subjectsData = Array.from(this.subjects.values());
      fs.writeFileSync(subjectsFile, JSON.stringify(subjectsData, null, 2));

      // Save chapters
      const chaptersFile = path.join(dataPath, 'chapters.json');
      const chaptersData = Array.from(this.chapters.values());
      fs.writeFileSync(chaptersFile, JSON.stringify(chaptersData, null, 2));
    } catch (error) {
      console.error('Error persisting data:', error);
    }
  }

  private async loadFromSupabase() {
    try {
      // Load questions from Supabase
      const { data: questions } = await supabase
        .from('questions')
        .select('*')
        .order('created_at', { ascending: true });

      if (questions) {
        questions.forEach((question: SupabaseQuestion) => {
          const questionData: Question = {
            id: question.id,
            chapterId: question.chapter_id,
            question: question.question,
            options: [question.option_a, question.option_b, question.option_c, question.option_d],
            correctAnswer: ['A', 'B', 'C', 'D'].indexOf(question.correct_answer),
            explanation: question.explanation,
            difficulty: question.difficulty,
            createdAt: new Date(question.created_at),
          };
          this.questions.set(question.id, questionData);
          if (question.id >= this.questionIdCounter) {
            this.questionIdCounter = question.id + 1;
          }
        });
      }
    } catch (error) {
      console.error('Error loading data from Supabase:', error);
    }
  }

  // Subjects
  async getSubjects(): Promise<Subject[]> {
    return Array.from(this.subjects.values());
  }

  async createSubject(subject: InsertSubject): Promise<Subject> {
    const id = this.subjectIdCounter++;
    const newSubject: Subject = { ...subject, id };
    this.subjects.set(id, newSubject);
    return newSubject;
  }

  // Chapters
  async getChapters(): Promise<Chapter[]> {
    return Array.from(this.chapters.values());
  }

  async getChaptersBySubject(subjectId: number): Promise<Chapter[]> {
    return Array.from(this.chapters.values()).filter(chapter => chapter.subjectId === subjectId);
  }

  async getChapter(id: number): Promise<Chapter | undefined> {
    return this.chapters.get(id);
  }

  async createChapter(chapter: InsertChapter): Promise<Chapter> {
    const id = this.chapterIdCounter++;
    const newChapter: Chapter = { 
      ...chapter, 
      id, 
      createdAt: new Date(),
      description: chapter.description || null,
      totalQuestions: 0,
      completedQuestions: 0
    };

    this.chapters.set(id, newChapter);
    await this.persistData(); // Persist the data
    return newChapter;
  }

  async updateChapter(id: number, chapter: Partial<InsertChapter>): Promise<Chapter | undefined> {
    const existing = this.chapters.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...chapter };
    this.chapters.set(id, updated);
    return updated;
  }

  async deleteChapter(id: number): Promise<boolean> {
    return this.chapters.delete(id);
  }

  // Questions
  async getQuestionsByChapter(chapterId: number): Promise<Question[]> {
    return Array.from(this.questions.values()).filter(q => q.chapterId === chapterId);
  }

  async getQuestionsBySubtopic(subtopicId: number): Promise<Question[]> {
    try {
      const { data: questions } = await supabase
        .from('questions')
        .select('*')
        .eq('subtopic_id', subtopicId);

      if (questions) {
        return questions.map((question: SupabaseQuestion) => ({
          id: question.id,
          chapterId: question.chapter_id,
          question: question.question,
          options: [question.option_a, question.option_b, question.option_c, question.option_d],
          correctAnswer: ['A', 'B', 'C', 'D'].indexOf(question.correct_answer),
          explanation: question.explanation,
          difficulty: question.difficulty,
          createdAt: new Date(question.created_at),
        }));
      }
    } catch (error) {
      console.error('Error getting subtopic questions:', error);
    }
    return [];
  }

  async getQuestion(id: number): Promise<Question | undefined> {
    return this.questions.get(id);
  }

  async createQuestion(question: InsertQuestion): Promise<Question> {
    // Convert the question format to internal format
    const options = [
      question.optionA,
      question.optionB || '',
      question.optionC || '',
      question.optionD || ''
    ];

    const correctAnswerIndex = ['A', 'B', 'C', 'D'].indexOf(question.correctAnswer);

    const newQuestion: Question = { 
      id: 0, // Will be set by Supabase
      chapterId: question.chapterId,
      question: question.question,
      options: options,
      correctAnswer: correctAnswerIndex,
      explanation: question.explanation || null,
      difficulty: question.difficulty || null,
      createdAt: new Date()
    };

    // Save to Supabase first to get the real ID
    try {
      const { data, error } = await supabase
        .from('questions')
        .insert({
          chapter_id: newQuestion.chapterId,
          subtopic_id: (question as any).subtopicId || null,
          question: newQuestion.question,
          option_a: options[0],
          option_b: options[1],
          option_c: options[2],
          option_d: options[3],
          correct_answer: question.correctAnswer,
          explanation: newQuestion.explanation,
          difficulty: newQuestion.difficulty,
        })
        .select()
        .single();

      if (error) throw error;

      // Update with the real ID from Supabase
      newQuestion.id = data.id;
      newQuestion.createdAt = new Date(data.created_at);

      this.questions.set(data.id, newQuestion);

      if (data.id >= this.questionIdCounter) {
        this.questionIdCounter = data.id + 1;
      }

      return newQuestion;
    } catch (error) {
      console.error('Error saving question to Supabase:', error);
      throw error;
    }
  }

  async createBulkQuestions(questions: InsertQuestion[]): Promise<Question[]> {
    const createdQuestions: Question[] = [];

    // Check if all chapters exist locally first
    const missingChapters = questions.filter(q => !this.chapters.has(q.chapterId));
    if (missingChapters.length > 0) {
      const missingIds = [...new Set(missingChapters.map(q => q.chapterId))];
      throw new Error(`Chapter(s) with ID(s) ${missingIds.join(', ')} not found. Please create the chapter first.`);
    }

    try {
      // Try to insert into Supabase for persistence, but only if chapter exists in Supabase
      let savedToSupabase = false;
      
      const questionsToInsert = questions.map(q => ({
        chapter_id: q.chapterId,
        subtopic_id: (q as any).subtopicId || null,
        question: q.question,
        option_a: q.optionA,
        option_b: q.optionB || '',
        option_c: q.optionC || '',
        option_d: q.optionD || '',
        correct_answer: q.correctAnswer,
        explanation: q.explanation || null,
        difficulty: q.difficulty || null,
      }));

      try {
        const { data, error } = await supabase
          .from('questions')
          .insert(questionsToInsert)
          .select();

        if (data && !error) {
          // Successfully saved to Supabase
          for (const question of data) {
            const internalQuestion: Question = {
              id: question.id,
              chapterId: question.chapter_id,
              question: question.question,
              options: [question.option_a, question.option_b, question.option_c, question.option_d],
              correctAnswer: ['A', 'B', 'C', 'D'].indexOf(question.correct_answer),
              explanation: question.explanation,
              difficulty: question.difficulty,
              createdAt: new Date(question.created_at),
            };

            this.questions.set(question.id, internalQuestion);
            createdQuestions.push(internalQuestion);

            if (question.id >= this.questionIdCounter) {
              this.questionIdCounter = question.id + 1;
            }
          }
          savedToSupabase = true;
        }
      } catch (supabaseError) {
        console.log('Supabase not available, using local storage:', supabaseError);
      }

      // If not saved to Supabase, save locally
      if (!savedToSupabase) {
        for (const q of questions) {
          const id = this.questionIdCounter++;
          const internalQuestion: Question = {
            id,
            chapterId: q.chapterId,
            question: q.question,
            options: [q.optionA, q.optionB || '', q.optionC || '', q.optionD || ''],
            correctAnswer: ['A', 'B', 'C', 'D'].indexOf(q.correctAnswer),
            explanation: q.explanation,
            difficulty: q.difficulty,
            createdAt: new Date(),
          };

          this.questions.set(id, internalQuestion);
          createdQuestions.push(internalQuestion);
        }
      }

      // Update chapter question counts
      for (const question of createdQuestions) {
        const chapter = this.chapters.get(question.chapterId);
        if (chapter) {
          chapter.totalQuestions = (chapter.totalQuestions || 0) + 1;
          this.chapters.set(chapter.id, chapter);
        }
      }

      await this.persistData(); // Save changes to file
      return createdQuestions;
    } catch (error) {
      console.error('Error in bulk create questions:', error);
      throw error;
    }
  }

  // Subtopics
  async getSubtopicsByChapter(chapterId: number): Promise<any[]> {
    return Array.from(this.subtopics.values()).filter(subtopic => subtopic.chapter_id === chapterId);
  }

  async createSubtopic(subtopic: any): Promise<any> {
    const id = this.subtopicIdCounter++;
    const newSubtopic = {
      id,
      title: subtopic.title,
      description: subtopic.description || null,
      chapter_id: subtopic.chapterId,
      created_at: new Date().toISOString(),
    };

    this.subtopics.set(id, newSubtopic);
    await this.persistData();
    return newSubtopic;
  }

  async deleteSubtopic(id: number): Promise<boolean> {
    const deleted = this.subtopics.delete(id);
    if (deleted) await this.persistData();
    return deleted;
  }

  // Messages
  async getMessages(): Promise<any[]> {
    try {
      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true });

      return messages || [];
    } catch (error) {
      console.error('Error getting messages:', error);
      return [];
    }
  }

  async createMessage(message: any): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          text: message.text,
          sender: message.sender,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating message:', error);
      throw error;
    }
  }

  // Files & Folders
  async getFiles(): Promise<any[]> {
    try {
      const { data: files } = await supabase
        .from('files')
        .select('*')
        .order('created_at', { ascending: true });

      return files || [];
    } catch (error) {
      console.error('Error getting files:', error);
      return [];
    }
  }

  async getFolders(): Promise<any[]> {
    try {
      const { data: folders } = await supabase
        .from('folders')
        .select('*')
        .order('created_at', { ascending: true });

      return folders || [];
    } catch (error) {
      console.error('Error getting folders:', error);
      return [];
    }
  }

  async createFile(file: any): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('files')
        .insert({
          name: file.name,
          type: file.type,
          size: file.size,
          path: file.path,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating file:', error);
      throw error;
    }
  }

  async createFolder(folder: any): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('folders')
        .insert({
          name: folder.name,
          path: folder.path,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
  }

  async deleteFile(id: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('files')
        .delete()
        .eq('id', id);

      return !error;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  async deleteFolder(id: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('folders')
        .delete()
        .eq('id', id);

      return !error;
    } catch (error) {
      console.error('Error deleting folder:', error);
      return false;
    }
  }

  // Quiz Sessions
  async createQuizSession(session: InsertQuizSession): Promise<QuizSession> {
    const id = this.sessionIdCounter++;
    const newSession: QuizSession = { 
      ...session, 
      id, 
      createdAt: new Date(),
      currentQuestion: session.currentQuestion || 0,
      score: session.score || 0,
      isCompleted: session.isCompleted || false
    };
    this.quizSessions.set(id, newSession);
    return newSession;
  }

  async getQuizSession(id: number): Promise<QuizSession | undefined> {
    return this.quizSessions.get(id);
  }

  async updateQuizSession(id: number, session: Partial<QuizSession>): Promise<QuizSession | undefined> {
    const existing = this.quizSessions.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...session };
    this.quizSessions.set(id, updated);
    return updated;
  }

  // Quiz Answers
  async createQuizAnswer(answer: InsertQuizAnswer): Promise<QuizAnswer> {
    const id = this.answerIdCounter++;
    const newAnswer: QuizAnswer = { ...answer, id };
    this.quizAnswers.set(id, newAnswer);
    return newAnswer;
  }

  async saveQuizAnswer(answer: InsertQuizAnswer): Promise<QuizAnswer> {
    return this.createQuizAnswer(answer);
  }

  async getQuizAnswers(sessionId: number): Promise<QuizAnswer[]> {
    return Array.from(this.quizAnswers.values()).filter(answer => answer.sessionId === sessionId);
  }

  async getQuizAnswersBySession(sessionId: number): Promise<QuizAnswer[]> {
    return this.getQuizAnswers(sessionId);
  }

  // Study Sessions
  async createStudySession(session: InsertStudySession): Promise<StudySession> {
    const id = this.studySessionIdCounter++;
    const newSession: StudySession = { 
      ...session, 
      id, 
      date: new Date()
    };
    this.studySessions.set(id, newSession);
    return newSession;
  }

  async getStudySessions(): Promise<StudySession[]> {
    return Array.from(this.studySessions.values());
  }

  async getStudySessionsByChapter(chapterId: number): Promise<StudySession[]> {
    return Array.from(this.studySessions.values()).filter(session => session.chapterId === chapterId);
  }

  // User Stats
  async getUserStats(): Promise<UserStats> {
    return this.userStatsData;
  }

  async updateUserStats(stats: Partial<UserStats>): Promise<UserStats> {
    this.userStatsData = { ...this.userStatsData, ...stats };
    return this.userStatsData;
  }

  // Schedule Events
  async getScheduleEvents(): Promise<ScheduleEvent[]> {
    return Array.from(this.scheduleEvents.values());
  }

  async getScheduleEventsByDate(date: Date): Promise<ScheduleEvent[]> {
    const targetDate = date.toDateString();
    return Array.from(this.scheduleEvents.values()).filter(event => 
      event.startTime.toDateString() === targetDate
    );
  }

  async createScheduleEvent(event: InsertScheduleEvent): Promise<ScheduleEvent> {
    const id = this.eventIdCounter++;
    const newEvent: ScheduleEvent = { ...event, id };
    this.scheduleEvents.set(id, newEvent);
    return newEvent;
  }

  async updateScheduleEvent(id: number, event: Partial<InsertScheduleEvent>): Promise<ScheduleEvent | undefined> {
    const existing = this.scheduleEvents.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...event };
    this.scheduleEvents.set(id, updated);
    return updated;
  }

  async deleteScheduleEvent(id: number): Promise<boolean> {
    return this.scheduleEvents.delete(id);
  }
}

// Use SupabaseStorage instead of MemStorage
export const storage = new SupabaseStorage();