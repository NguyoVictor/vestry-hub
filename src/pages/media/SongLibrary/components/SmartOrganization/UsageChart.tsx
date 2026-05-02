/**
 * UsageChart Component for Song Library UI Revamp
 * 
 * Displays usage analytics in chart format using Recharts
 * Shows monthly/yearly usage trends with interactive features
 * 
 * Requirements: 9.5, 9.6
 */

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface UsageChartProps {
  data: Array<{
    period: string;
    total_usage: number;
    unique_songs: number;
    top_song_title: string;
    top_song_artist: string;
    top_song_usage: number;
  }>;
  type?: 'line' | 'bar' | 'pie';
  height?: number;
}

export function UsageChart({ data, type = 'line', height = 300 }: UsageChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 font-jakarta">
        No usage data available
      </div>
    );
  }

  // Transform data for charts
  const chartData = data.map(item => ({
    period: item.period,
    usage: item.total_usage,
    songs: item.unique_songs,
    topSongUsage: item.top_song_usage,
    topSong: `${item.top_song_title} - ${item.top_song_artist}`.substring(0, 30)
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg font-jakarta">
          <p className="font-semibold text-slate-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (type === 'line') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis 
            dataKey="period" 
            stroke="#64748b"
            fontSize={12}
            fontFamily="Plus Jakarta Sans"
          />
          <YAxis 
            stroke="#64748b"
            fontSize={12}
            fontFamily="Plus Jakarta Sans"
          />
          <Tooltip content={<CustomTooltip />} />
          <Line 
            type="monotone" 
            dataKey="usage" 
            stroke="#f97316" 
            strokeWidth={2}
            dot={{ fill: '#f97316', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#f97316', strokeWidth: 2 }}
            name="Total Usage"
          />
          <Line 
            type="monotone" 
            dataKey="songs" 
            stroke="#3b82f6" 
            strokeWidth={2}
            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
            name="Unique Songs"
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis 
            dataKey="period" 
            stroke="#64748b"
            fontSize={12}
            fontFamily="Plus Jakarta Sans"
          />
          <YAxis 
            stroke="#64748b"
            fontSize={12}
            fontFamily="Plus Jakarta Sans"
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey="usage" 
            fill="#f97316" 
            radius={[4, 4, 0, 0]}
            name="Total Usage"
          />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // Pie chart for service type distribution
  const pieData = chartData.slice(0, 6).map((item, index) => ({
    name: item.period,
    value: item.usage,
    color: `hsl(${index * 60}, 70%, 50%)`
  }));

  const COLORS = ['#f97316', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={pieData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {pieData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export default UsageChart;