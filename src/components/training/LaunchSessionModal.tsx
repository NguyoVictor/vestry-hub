import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES } from "@/lib/schema";
import { generateGamePin } from "@/lib/gamePin";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Rocket, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface LaunchSessionModalProps {
  open: boolean;
  onClose: () => void;
  courseId?: string;
  courseName?: string;
}

export function LaunchSessionModal({ open, onClose, courseId, courseName }: LaunchSessionModalProps) {
  const navigate = useNavigate();
  const { tenantId, userId } = useChurch();
  const [selectedQuiz, setSelectedQuiz] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const handleStartSession = async () => {
    if (!selectedQuiz || !tenantId || !userId) {
      toast.error("Please select a quiz to launch");
      return;
    }

    setIsLoading(true);
    try {
      // Generate unique game PIN
      const gamePin = generateGamePin();
      
      // Check PIN uniqueness
      const { data: existingSessions } = await supabase
        .from(TABLES.QUIZ_SESSIONS)
        .select('id')
        .eq('game_pin', gamePin)
        .in('status', ['waiting', 'active']);

      if (existingSessions && existingSessions.length > 0) {
        // Retry with new PIN if collision
        const newPin = generateGamePin();
        const { data: newSession, error } = await supabase
          .from(TABLES.QUIZ_SESSIONS)
          .insert({
            game_pin: newPin,
            quiz_id: selectedQuiz,
            course_id: courseId,
            status: 'waiting',
            host_id: userId,
            tenant_id: tenantId,
            theme: 'classic',
            confetti_enabled: true,
            music_enabled: true,
            current_question_index: 0,
            join_url: `${window.location.origin}/join/${newPin}`,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;
        
        // Add host as participant
        await supabase
          .from(TABLES.QUIZ_PARTICIPANTS)
          .insert({
            session_id: newSession.id,
            member_id: userId,
            display_name: "Host",
            avatar_emoji: "👨‍🏫",
            is_host: true,
            score: 0,
            coins: 0,
            streak: 0,
            joined_at: new Date().toISOString()
          });

        navigate(`/training/host/${newSession.id}`);
        onClose();
        toast.success("Live quiz session created!");
      } else {
        // Use original PIN
        const { data: newSession, error } = await supabase
          .from(TABLES.QUIZ_SESSIONS)
          .insert({
            game_pin: gamePin,
            quiz_id: selectedQuiz,
            course_id: courseId,
            status: 'waiting',
            host_id: userId,
            tenant_id: tenantId,
            theme: 'classic',
            confetti_enabled: true,
            music_enabled: true,
            current_question_index: 0,
            join_url: `${window.location.origin}/join/${gamePin}`,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;
        
        // Add host as participant
        await supabase
          .from(TABLES.QUIZ_PARTICIPANTS)
          .insert({
            session_id: newSession.id,
            member_id: userId,
            display_name: "Host",
            avatar_emoji: "👨‍🏫",
            is_host: true,
            score: 0,
            coins: 0,
            streak: 0,
            joined_at: new Date().toISOString()
          });

        navigate(`/training/host/${newSession.id}`);
        onClose();
        toast.success("Live quiz session created!");
      }
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error("Failed to create quiz session");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-purple-600" />
            Launch Live Quiz
          </DialogTitle>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {courseName && (
            <div className="rounded-lg bg-purple-50 border border-purple-200 p-3">
              <p className="text-sm text-purple-700">
                <span className="font-medium">Course:</span> {courseName}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="quiz-select">Select Quiz/Lesson</Label>
            <Select value={selectedQuiz} onValueChange={setSelectedQuiz}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a quiz to launch..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sample-quiz-1">Bible Knowledge Quiz</SelectItem>
                <SelectItem value="sample-quiz-2">New Testament Overview</SelectItem>
                <SelectItem value="sample-quiz-3">Christian Living Basics</SelectItem>
                <SelectItem value="sample-quiz-4">Church History Quiz</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
            <h4 className="font-medium text-sm text-slate-700 mb-2">Session Features:</h4>
            <ul className="text-xs text-slate-600 space-y-1">
              <li>• Real-time multiplayer quiz</li>
              <li>• Automatic scoring & leaderboards</li>
              <li>• Mobile-friendly for participants</li>
              <li>• Projector-optimized host view</li>
            </ul>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleStartSession}
              disabled={!selectedQuiz || isLoading}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4 mr-2" />
                  Start Session
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}