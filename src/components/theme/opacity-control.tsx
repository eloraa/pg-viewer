import * as React from 'react';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type OpacityControlProps = {
  value: number;
  onChange: (value: number) => void;
} & Omit<React.ComponentProps<typeof Slider>, 'value' | 'onValueChange' | 'onValueCommit' | 'onChange'>;

export const OpacityControl: React.FC<OpacityControlProps> = ({ value, onChange, className, majorTickInterval, majorTickLabelStep, minorTicksPerInterval, ...props }) => {
  const [opacityInput, setOpacityInput] = React.useState(value.toString());
  const [sliderValue, setSliderValue] = React.useState(value);

  // Sync input field and slider with state
  React.useEffect(() => {
    setOpacityInput(value.toString());
    setSliderValue(value);
  }, [value]);

  return (
    <div className={cn('flex flex-col gap-2 w-full max-w-xs pt-5 md:pt-3', className)}>
      <div className="flex md:items-center gap-3 max-md:flex-col">
        <div className="mt-6 pl-1 relative flex-1">
          <Slider
            min={0}
            max={1}
            step={0.01}
            value={[sliderValue]}
            onValueChange={([val]) => {
              setSliderValue(val);
              setOpacityInput(val.toString());
            }}
            onValueCommit={([val]) => {
              onChange(val);
            }}
            className="w-full relative -mt-3.5"
            analogTicks
            sparseLabels
            majorTickInterval={majorTickInterval}
            majorTickLabelStep={majorTickLabelStep}
            minorTicksPerInterval={minorTicksPerInterval}
            {...props}
          />
        </div>
        <input
          type="number"
          min={0}
          max={1}
          step={0.01}
          value={opacityInput}
          onChange={e => {
            setOpacityInput(e.target.value);
            const val = parseFloat(e.target.value);
            if (!isNaN(val)) setSliderValue(val);
          }}
          onBlur={() => {
            const val = parseFloat(opacityInput);
            if (isNaN(val) || val < 0 || val > 1) {
              toast.error('Opacity must be between 0 and 1');
              setOpacityInput(value.toString());
              setSliderValue(value);
            } else {
              onChange(val);
            }
          }}
          className="w-16 border rounded px-2 py-1 text-sm"
        />
      </div>
    </div>
  );
};
