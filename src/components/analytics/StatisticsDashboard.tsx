"use client"

import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer,
  RadialBarChart, RadialBar
} from 'recharts';
import { format } from 'date-fns';

interface StatisticsData {
  overview: {
    totalWords: number;
    wordsLearned: number;
    averageAccuracy: number;
    studyStreak: number;
    totalQuizzes: number;
    totalStudyTime: number;
  };
  weeklyProgress: Array<{
    date: string;
    wordsLearned: number;
    quizzesCompleted: number;
    accuracy: number;
  }>;
  masteryDistribution: Array<{
    level: number;
    count: number;
  }>;
  hskProgress: Array<{
    level: number;
    total: number;
    learned: number;
    percentage: number;
  }>;
  recentActivity: Array<{
    date: string;
    type: 'quiz' | 'vocabulary';
    description: string;
    score?: number;
  }>;
}

const StatisticsDashboard: React.FC = () => {
  const [data, setData] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/statistics');
      if (!response.ok) {
        throw new Error('Failed to fetch statistics');
      }
      const statisticsData = await response.json();
      setData(statisticsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-800">Error loading statistics: {error}</p>
        <button 
          onClick={fetchStatistics}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { overview, weeklyProgress, masteryDistribution, hskProgress, recentActivity } = data;

  // Colors for charts
  const COLORS = ['#DC2626', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6'];

  const masteryData = masteryDistribution.map(item => ({
    name: `Level ${item.level}`,
    value: item.count,
    level: item.level
  }));

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-red-600">{overview.totalWords}</div>
          <div className="text-sm text-gray-600">Total Words</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-green-600">{overview.wordsLearned}</div>
          <div className="text-sm text-gray-600">Words Learned</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-blue-600">{overview.averageAccuracy}%</div>
          <div className="text-sm text-gray-600">Avg Accuracy</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-purple-600">{overview.studyStreak}</div>
          <div className="text-sm text-gray-600">Day Streak</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-orange-600">{overview.totalQuizzes}</div>
          <div className="text-sm text-gray-600">Quizzes Taken</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-yellow-600">{overview.totalStudyTime}</div>
          <div className="text-sm text-gray-600">Study Minutes</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Weekly Progress Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Progress</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weeklyProgress}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="wordsLearned" 
                stroke="#22C55E" 
                strokeWidth={2}
                name="Words Learned"
              />
              <Line 
                type="monotone" 
                dataKey="quizzesCompleted" 
                stroke="#3B82F6" 
                strokeWidth={2}
                name="Quizzes Completed"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Mastery Distribution */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Mastery Level Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={masteryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {masteryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* HSK Progress */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">HSK Level Progress</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={hskProgress}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="level" tickFormatter={(value) => `HSK ${value}`} />
              <YAxis />
              <Tooltip formatter={(value, name) => [value, name === 'percentage' ? 'Progress %' : name]} />
              <Legend />
              <Bar dataKey="total" fill="#E5E7EB" name="Total Words" />
              <Bar dataKey="learned" fill="#22C55E" name="Words Learned" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly Accuracy Trend */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quiz Accuracy Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weeklyProgress}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 100]} />
              <Tooltip formatter={(value) => [`${value}%`, 'Accuracy']} />
              <Line 
                type="monotone" 
                dataKey="accuracy" 
                stroke="#DC2626" 
                strokeWidth={3}
                dot={{ fill: '#DC2626', strokeWidth: 2, r: 4 }}
                name="Accuracy %"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* HSK Progress Radial Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">HSK Progress Overview</h3>
        <ResponsiveContainer width="100%" height={400}>
          <RadialBarChart cx="50%" cy="50%" innerRadius="10%" outerRadius="80%" data={hskProgress}>
            <RadialBar
              label={{ position: 'insideStart', fill: '#fff' }}
              background
              dataKey="percentage"
            >
              {hskProgress.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </RadialBar>
            <Legend iconSize={12} />
            <Tooltip formatter={(value) => [`${value}%`, 'Progress']} />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Activity */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {recentActivity.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No recent activity</p>
          ) : (
            recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    activity.type === 'quiz' ? 'bg-blue-500' : 'bg-green-500'
                  }`}></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                    <p className="text-xs text-gray-500">{activity.date}</p>
                  </div>
                </div>
                {activity.score !== undefined && (
                  <div className="text-sm font-semibold text-gray-700">
                    {activity.score}%
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default StatisticsDashboard;