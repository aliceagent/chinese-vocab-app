"use client"

import React from 'react';
import { useProgressTracking } from '@/hooks/useProgressTracking';

interface ProgressIndicatorProps {
  masteryLevel: number;
  correctAnswers?: number;
  totalAttempts?: number;
  lastPracticed?: string;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  masteryLevel,
  correctAnswers = 0,
  totalAttempts = 0,
  lastPracticed,
  showDetails = true,
  size = 'md'
}) => {
  const { getMasteryLabel, calculateMasteryColor, calculateAccuracy } = useProgressTracking();

  const accuracy = calculateAccuracy(correctAnswers, totalAttempts);
  const masteryColor = calculateMasteryColor(masteryLevel);
  const masteryLabel = getMasteryLabel(masteryLevel);

  // Size configurations
  const sizeConfig = {
    sm: {
      indicator: 'w-2 h-2',
      text: 'text-xs',
      badge: 'text-xs px-2 py-1'
    },
    md: {
      indicator: 'w-3 h-3',
      text: 'text-sm',
      badge: 'text-sm px-3 py-1'
    },
    lg: {
      indicator: 'w-4 h-4',
      text: 'text-base',
      badge: 'text-base px-4 py-2'
    }
  };

  const config = sizeConfig[size];

  // Color mapping for mastery levels
  const colorClasses = {
    0: 'bg-gray-400',
    1: 'bg-red-500',
    2: 'bg-yellow-500',
    3: 'bg-blue-500',
    4: 'bg-green-500',
    5: 'bg-purple-500'
  };

  const bgColorClass = colorClasses[masteryLevel as keyof typeof colorClasses] || colorClasses[0];

  if (!showDetails) {
    return (
      <div className="flex items-center space-x-1">
        <div className={`rounded-full ${config.indicator} ${bgColorClass}`} />
        <span className={`${config.text} ${masteryColor} font-medium`}>
          {masteryLabel}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Mastery Level Badge */}
      <div className="flex items-center space-x-2">
        <div className={`rounded-full ${config.indicator} ${bgColorClass}`} />
        <span className={`${config.badge} ${masteryColor} bg-opacity-10 rounded-full font-medium`}>
          {masteryLabel} (Level {masteryLevel})
        </span>
      </div>

      {/* Progress Details */}
      {totalAttempts > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className={`${config.text} text-gray-600`}>Practice History:</span>
            <span className={`${config.text} font-medium text-gray-900`}>
              {correctAnswers}/{totalAttempts} ({accuracy}%)
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                accuracy >= 80 ? 'bg-green-500' :
                accuracy >= 60 ? 'bg-yellow-500' :
                accuracy >= 40 ? 'bg-orange-500' : 'bg-red-500'
              }`}
              style={{ width: `${accuracy}%` }}
            />
          </div>
        </div>
      )}

      {/* Last Practiced */}
      {lastPracticed && (
        <div className="flex justify-between items-center">
          <span className={`${config.text} text-gray-600`}>Last practiced:</span>
          <span className={`${config.text} text-gray-500`}>
            {new Date(lastPracticed).toLocaleDateString()}
          </span>
        </div>
      )}

      {/* Mastery Progress Bar */}
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className={`${config.text} text-gray-600`}>Mastery Progress:</span>
          <span className={`${config.text} text-gray-500`}>{masteryLevel}/5</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-red-500 via-yellow-500 via-blue-500 via-green-500 to-purple-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(masteryLevel / 5) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default ProgressIndicator;