import React, { ReactNode } from 'react';
import Card, { CardContent, CardHeader } from './Card';

interface StatCardProps {
  title: string;
  value: string;
  percentageChange?: number;
  changePeriod?: string;
  icon?: ReactNode;
  description?: string;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, percentageChange, changePeriod, icon, description, onClick }) => {
  const isClickable = !!onClick;

  return (
    <Card 
      className={isClickable ? 'cursor-pointer transition-all hover:shadow-md hover:-translate-y-1' : ''}
      onClick={onClick}
    >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
            {icon}
        </CardHeader>
        <CardContent>
            <div className="text-3xl font-bold text-foreground">{value}</div>
            {percentageChange !== undefined && changePeriod && (
                <p className={`text-xs ${percentageChange >= 0 ? 'text-green-600' : 'text-destructive'} dark:${percentageChange >= 0 ? 'text-green-500' : 'text-destructive'}`}>
                    {percentageChange >= 0 ? '+' : ''}{percentageChange.toFixed(1)}% {changePeriod}
                </p>
            )}
            {description && (
                <p className="text-xs text-muted-foreground">{description}</p>
            )}
        </CardContent>
    </Card>
  );
};

export default StatCard;