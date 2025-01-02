import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";

interface AdvancedSettingsProps {
  contextMemoryLength: string;
  conversationTimeout: number;
  onContextMemoryChange: (value: string) => void;
  onTimeoutChange: (value: number) => void;
}

export const AdvancedSettings = ({
  contextMemoryLength,
  conversationTimeout,
  onContextMemoryChange,
  onTimeoutChange,
}: AdvancedSettingsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const handleTimeoutChange = (value: string) => {
    const numValue = parseInt(value);
    if (isNaN(numValue)) {
      toast({
        variant: "destructive",
        title: "Invalid input",
        description: "Please enter a valid number between 1 and 6",
      });
      return;
    }

    if (numValue < 1 || numValue > 6) {
      toast({
        variant: "destructive",
        title: "Invalid range",
        description: "Timeout must be between 1 and 6 hours",
      });
      return;
    }

    onTimeoutChange(numValue);
  };

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="border rounded-lg"
    >
      <CollapsibleTrigger className="flex w-full justify-between items-center p-4 hover:bg-slate-50 dark:hover:bg-slate-800">
        <h2 className="text-lg font-medium">Advanced Settings</h2>
        <span className="text-sm text-slate-500">
          {isOpen ? "Hide" : "Show"}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="p-4 pt-0">
        <div className="space-y-4">
          <label className="text-sm font-medium">Context Memory Length</label>
          <RadioGroup
            value={contextMemoryLength}
            onValueChange={onContextMemoryChange}
            className="flex flex-wrap gap-4"
          >
            {["1", "2", "3", "5", "Disable"].map((value) => (
              <div key={value} className="flex items-center space-x-2">
                <RadioGroupItem value={value} id={`memory-${value}`} />
                <Label htmlFor={`memory-${value}`}>{value}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-2 mt-4">
          <label className="text-sm font-medium">
            New Conversation Timeout (hours)
          </label>
          <Input
            type="number"
            min={1}
            max={6}
            value={conversationTimeout}
            onChange={(e) => handleTimeoutChange(e.target.value)}
            className="w-full"
          />
          <p className="text-xs text-slate-500">
            Set between 1-6 hours
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};