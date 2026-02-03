import { useState } from "react";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { AssociationRule } from "@/pages/Dashboard";

interface SavedRulesButtonProps {
  rule: AssociationRule;
  onSaved?: () => void;
}

export function SavedRulesButton({ rule, onSaved }: SavedRulesButtonProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Please sign in to save rules");
        return;
      }

      const { error } = await supabase
        .from("saved_rules")
        .insert({
          user_id: user.id,
          antecedent: rule.antecedent,
          consequent: rule.consequent,
          support: rule.support,
          confidence: rule.confidence,
          lift: rule.lift,
          rule_name: `${rule.antecedent.join(", ")} → ${rule.consequent.join(", ")}`,
        });

      if (error) {
        if (error.code === "23505") {
          toast.info("This rule is already saved");
        } else {
          throw error;
        }
      } else {
        setIsSaved(true);
        toast.success("Rule saved successfully!");
        onSaved?.();
      }
    } catch (error) {
      console.error("Error saving rule:", error);
      toast.error("Failed to save rule");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleSave}
      disabled={isSaving || isSaved}
      className="h-8 w-8"
      title={isSaved ? "Rule saved" : "Save this rule"}
    >
      {isSaving ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isSaved ? (
        <BookmarkCheck className="w-4 h-4 text-primary" />
      ) : (
        <Bookmark className="w-4 h-4" />
      )}
    </Button>
  );
}
