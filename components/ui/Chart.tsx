import React, { useState, useRef, useLayoutEffect, useMemo } from 'react';
import { formatPrice } from '../../contexts/BusinessContext';

interface ChartData {
    label: string;
    value: number;
}

interface ChartProps {
    data: ChartData[];
    metric: 'appointments' | 'revenue' | 'clients';
    currency: string;
}

interface TooltipData {
    visible: boolean;
    content: string;
    x: number;
    y: number;
}

const NoDataIcon: React.FC = () => (
    <div className="flex flex-col items-center justify-center text-muted-foreground">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
        </svg>
        <p className="mt-4">No data available for this period.</p>
    </div>
);

const Chart: React.FC<ChartProps> = ({ data, metric, currency }) => {
    const [tooltip, setTooltip] = useState<TooltipData>({ visible: false, content: '', x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 350 });
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    useLayoutEffect(() => {
        const observer = new ResizeObserver((entries) => {
            if (entries[0]) {
                const { width } = entries[0].contentRect;
                setDimensions({ width, height: 350 });
            }
        });

        const currentRef = containerRef.current;
        if (currentRef) {
            observer.observe(currentRef);
        }

        return () => {
            if (currentRef) {
                observer.unobserve(currentRef);
            }
        };
    }, []);

    const { yAxisLabels, maxDataValue, padding, chartHeight, chartWidth } = useMemo(() => {
        const padding = { top: 20, right: 10, bottom: 60, left: 60 };
        const chartHeight = dimensions.height - padding.top - padding.bottom;
        const chartWidth = dimensions.width > 0 ? dimensions.width - padding.left - padding.right : 0;
        
        const rawMax = data.length > 0 ? Math.max(...data.map(d => d.value), 0) : 0;
        const niceMaxValue = rawMax > 0 ? Math.ceil(rawMax / 5) * 5 : 10;

        const labels = [];
        const tickCount = 5;
        for (let i = 0; i <= tickCount; i++) {
            labels.push((niceMaxValue / tickCount) * i);
        }

        return { yAxisLabels: labels, maxDataValue: niceMaxValue, padding, chartHeight, chartWidth };
    }, [data, dimensions.width, dimensions.height]);

    const { points, linePath, areaPath } = useMemo(() => {
        if (!data || data.length < 2 || chartWidth <= 0) {
            return { points: [], linePath: '', areaPath: '' };
        }
        
        const getX = (index: number) => padding.left + (index / (data.length - 1)) * chartWidth;
        const getY = (value: number) => padding.top + chartHeight - (Math.max(0, value) / maxDataValue * chartHeight);

        const calculatedPoints = data.map((item, index) => ({
            x: getX(index),
            y: getY(item.value),
            data: item
        }));

        const linePathData = calculatedPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
        const areaPathData = `${linePathData} L${calculatedPoints[calculatedPoints.length - 1].x},${padding.top + chartHeight} L${calculatedPoints[0].x},${padding.top + chartHeight} Z`;

        return { points: calculatedPoints, linePath: linePathData, areaPath: areaPathData };
    }, [data, chartWidth, chartHeight, padding, maxDataValue]);

    if (!data || data.length === 0) {
        return <div className="relative w-full h-[350px] flex items-center justify-center"><NoDataIcon /></div>;
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!containerRef.current || points.length === 0) return;
        const rect = containerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;

        let closestIndex = 0;
        let minDistance = Infinity;
        points.forEach((point, index) => {
            const distance = Math.abs(point.x - mouseX);
            if (distance < minDistance) {
                minDistance = distance;
                closestIndex = index;
            }
        });
        
        handleMouseOver(e, closestIndex);
    };

    const handleMouseOver = (e: React.MouseEvent, index: number) => {
        const point = points[index];
        if (!point) return;

        let content = '';
        const metricName = metric.charAt(0).toUpperCase() + metric.slice(1);
        if (metric === 'revenue') {
             content = `${point.data.label}<br/><span style="color: var(--primary); font-weight: 600;">${formatPrice(point.data.value, currency)}</span>`;
        } else {
            const plural = point.data.value !== 1 && !metricName.endsWith('s') ? 's' : '';
            content = `${point.data.label}<br/><span style="color: var(--primary); font-weight: 600;">${point.data.value.toLocaleString()} ${metricName.toLowerCase()}${plural}</span>`;
        }
        
        setHoveredIndex(index);
        setTooltip({ visible: true, content, x: point.x, y: point.y });
    };

    const handleMouseOut = () => {
        setHoveredIndex(null);
        setTooltip({ ...tooltip, visible: false });
    };
    
    const hoveredPoint = hoveredIndex !== null ? points[hoveredIndex] : null;

    return (
        <div className="relative w-full h-[350px]" ref={containerRef} onMouseLeave={handleMouseOut}>
            <svg width="100%" height="100%" viewBox={`0 0 ${dimensions.width} ${dimensions.height}`} className="font-sans" onMouseMove={handleMouseMove}>
                <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.4"/>
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity="0"/>
                    </linearGradient>
                </defs>
                
                <g className="y-axis">
                    {yAxisLabels.map((label, i) => {
                        const y = padding.top + chartHeight - (label / maxDataValue * chartHeight);
                        return (
                            <g key={i}>
                                <line x1={padding.left} y1={y} x2={dimensions.width - padding.right} y2={y} stroke="var(--border)" strokeDasharray="3 3" />
                                <text x={padding.left - 8} y={y + 4} textAnchor="end" className="text-xs fill-muted-foreground">
                                    {metric === 'revenue' ? formatPrice(label, currency).replace(/\.00$/, '') : label}
                                </text>
                            </g>
                        );
                    })}
                </g>

                <g className="x-axis">
                     {points.map((point, index) => (
                        <text
                            key={index}
                            x={point.x}
                            y={padding.top + chartHeight + 20}
                            textAnchor="end"
                            transform={`rotate(-45, ${point.x}, ${padding.top + chartHeight + 20})`}
                            className="text-xs fill-muted-foreground"
                        >
                            {point.data.label}
                        </text>
                    ))}
                </g>
                
                {linePath && areaPath && (
                  <>
                    <path d={areaPath} fill="url(#areaGradient)" />
                    <path d={linePath} fill="none" stroke="var(--primary)" strokeWidth="2" />
                  </>
                )}
                
                {hoveredPoint && (
                    <g>
                        <line
                            x1={hoveredPoint.x}
                            y1={padding.top}
                            x2={hoveredPoint.x}
                            y2={padding.top + chartHeight}
                            stroke="var(--primary)"
                            strokeWidth="1"
                            strokeDasharray="3 3"
                        />
                        <circle
                            cx={hoveredPoint.x}
                            cy={hoveredPoint.y}
                            r="5"
                            fill="var(--primary)"
                            stroke="var(--card)"
                            strokeWidth="2"
                        />
                    </g>
                )}
            </svg>
            
            {tooltip.visible && (
                <div
                    className="absolute p-2 text-sm bg-card text-card-foreground rounded-md shadow-lg pointer-events-none transition-transform duration-100 border border-border"
                    style={{
                        transform: `translate(${tooltip.x}px, ${tooltip.y}px) translate(-50%, -120%)`,
                        left: 0,
                        top: 0,
                    }}
                    dangerouslySetInnerHTML={{ __html: tooltip.content }}
                />
            )}
        </div>
    );
};

export default Chart;
