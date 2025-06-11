import { Card, CardContent } from "@/components/ui/card";
import { Target, CheckCircle, BookOpen, Clock, Flame, PlayCircle } from "lucide-react";

export default function Dashboard() {
  // Static dashboard data - no database calls needed
  const stats = {
    totalQuestionsSolved: 1247,
    totalCorrectAnswers: 1098,
    studyStreak: 12,
    totalStudyTimeMinutes: 850
  };

  const accuracy = Math.round((stats.totalCorrectAnswers / stats.totalQuestionsSolved) * 100);
  const studyTimeHours = Math.round((stats.totalStudyTimeMinutes / 60) * 10) / 10;

  return (
    <section className="mb-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Dashboard</h2>
        <p className="text-gray-400">Track your preparation progress</p>
      </div>

      {/* Study streak banner */}
      <div className="mb-6 p-6 rounded-2xl bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-1 flex items-center">
                <Flame className="w-6 h-6 mr-1 text-orange-400" />
                Study Streak
              </h3>
              <p className="text-gray-300">Keep up the momentum!</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-orange-400">{stats.studyStreak}</div>
              <div className="text-sm text-gray-300">days</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="glass-morphism hover:bg-opacity-20 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-green-400" />
              </div>
              <span className="text-xs text-gray-400">Overall</span>
            </div>
            <div className="text-2xl font-bold mb-1">{accuracy}%</div>
            <p className="text-sm text-gray-400">Accuracy</p>
          </CardContent>
        </Card>

        <Card className="glass-morphism hover:bg-opacity-20 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-xs text-gray-400">Total</span>
            </div>
            <div className="text-2xl font-bold mb-1">{stats.totalQuestionsSolved.toLocaleString()}</div>
            <p className="text-sm text-gray-400">Questions Solved</p>
          </CardContent>
        </Card>

        <Card className="glass-morphism hover:bg-opacity-20 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-purple-400" />
              </div>
              <span className="text-xs text-gray-400">Active</span>
            </div>
            <div className="text-2xl font-bold mb-1">8</div>
            <p className="text-sm text-gray-400">Chapters</p>
          </CardContent>
        </Card>

        <Card className="glass-morphism hover:bg-opacity-20 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-400" />
              </div>
              <span className="text-xs text-gray-400">Total</span>
            </div>
            <div className="text-2xl font-bold mb-1">{studyTimeHours}h</div>
            <p className="text-sm text-gray-400">Study Time</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="glass-morphism">
        <CardContent className="p-6">
          <h3 className="text-lg font-bold mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm">Completed Physics Chapter 12</p>
                <p className="text-xs text-gray-400">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                <PlayCircle className="w-4 h-4 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm">Started Chemistry Quiz</p>
                <p className="text-xs text-gray-400">5 hours ago</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}