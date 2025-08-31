'use client';

import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';

import { cn } from '@/lib/utils';

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  step = 1,
  majorTickInterval,
  analogTicks = false,
  majorTickLabelStep,
  sparseLabels = false,
  minorTicksPerInterval = 4,
  labelFormat = (value: number) => parseFloat(value.toFixed(4)).toString(),
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root> & {
  majorTickInterval?: number;
  analogTicks?: boolean;
  majorTickLabelStep?: number;
  sparseLabels?: boolean;
  minorTicksPerInterval?: number;
  labelFormat?: (value: number) => string;
}) {
  
  const _values = React.useMemo(() => (Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [min, max]), [value, defaultValue, min, max]);

  const majorTicks = React.useMemo(() => {
    let ticks: number[];
    if (majorTickInterval !== undefined && majorTickInterval > 0) {
      const numMajorTicks = majorTickInterval + 1;
      ticks = Array.from({ length: numMajorTicks }, (_, i) => min + (i * (max - min)) / majorTickInterval);
    } else if (majorTickLabelStep) {
      const majorStep = majorTickLabelStep;
      const numMajorTicks = Math.floor((max - min) / majorStep) + 1;
      ticks = Array.from({ length: numMajorTicks }, (_, i) => min + i * majorStep);
    } else {
      const numMajorTicks = 5 + 1;
      ticks = Array.from({ length: numMajorTicks }, (_, i) => min + (i * (max - min)) / 5);
    }
    return ticks;
  }, [min, max, majorTickInterval, majorTickLabelStep]);

  const ticks = React.useMemo(() => {
    if (!analogTicks) return [];
    
    const tickElements = [];
    const offsetPx = 4;
    
    for (let i = 0; i < majorTicks.length; i++) {
      const tick = majorTicks[i];
      const showLabel = sparseLabels;
      const leftPercent = ((tick - min) / (max - min)) * 100;
      const left = `calc((${leftPercent}% + ${offsetPx - leftPercent * ((2 * offsetPx) / 100)}px) - 0.9px)`;
      
      if (showLabel) {
        tickElements.push(
          <span
            key={`label-${i}-${tick}`}
            className="text-xs font-medium text-muted-foreground"
            style={{
              userSelect: 'none',
              position: 'absolute',
              left,
              top: -24,
              transform: 'translateX(-50%)',
              pointerEvents: 'none',
            }}
          >
            {labelFormat(tick)}
          </span>
        );
      }
      
      tickElements.push(
        <div
          className="absolute"
          style={{
            width: 0,
            left,
            top: -5,
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
          }}
          key={`major-tick-${i}-${tick}`}
        >
          <div className="w-0.5 h-4 bg-tertiary rounded" />
        </div>
      );
      
      if (i < majorTicks.length - 1 && minorTicksPerInterval > 0) {
        const nextTick = majorTicks[i + 1];
        const stepBetweenMajorTicks = nextTick - tick;
        for (let j = 1; j <= minorTicksPerInterval; j++) {
          const minorTick = tick + j * (stepBetweenMajorTicks / (minorTicksPerInterval + 1));
          const minorLeftPercent = ((minorTick - min) / (max - min)) * 100;
          const minorLeft = `calc(${minorLeftPercent}% + ${offsetPx - minorLeftPercent * ((2 * offsetPx) / 100)}px)`;
          tickElements.push(
            <div
              key={`minor-tick-${i}-${j}-${minorTick}`}
              className="absolute -z-1"
              style={{
                left: minorLeft,
                top: -2,
                width: 0,
                transform: 'translateX(-50%)',
                pointerEvents: 'none',
              }}
            >
              <div className="w-px h-2.5 bg-brand-sapphire rounded"></div>
            </div>
          );
        }
      }
    }
    
    return tickElements;
  }, [analogTicks, majorTicks, min, max, sparseLabels, minorTicksPerInterval, labelFormat]);

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      step={step}
      className={cn(
        'relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col',
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className={cn(
          'bg-muted relative grow rounded-full data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5 shadow-inner'
        )}
      >
        {ticks}
        <SliderPrimitive.Range data-slot="slider-range" className={cn('bg-tertiary absolute data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full z-0 rounded-full')} />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          className="border-foreground bg-tertiary ring-ring/50 block h-5 w-2 shrink-0 rounded-full border shadow-lg transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50"
        />
      ))}
    </SliderPrimitive.Root>
  );
}

export { Slider };
