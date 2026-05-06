import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { PinEntry } from "@/components/quiz/PinEntry";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function QuizJoinPage() {
  const { pin: urlPin } = useParams();
  const navigate = useNavigate();
  const { userId } = useChurch();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");

  // Auto-submit if PIN is in URL
  useEffect(() => {
    if (urlPin && urlPin.length === 6) {
      handlePinSubmit(urlPin.toUpperCase());
    }
  }, [urlPin]);

  const handlePinSubmit = async (pin: string) => {
    if (!userId) {
      toast.error("Please log in to join a quiz");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Check if session exists and is active
      const { data: session, error: sessionError } = await supabase
        .from('quiz_sessions')
        .select('id, status, course_id')
        .eq('game_pin', pin)
        .in('status', ['waiting', 'active'])
        .single();

      if (sessionError || !session) {
        setError("PIN not found or session has ended");
        return;
      }

      // Check if user is already in this session
      const { data: existingParticipant } = await supabase
        .from('quiz_participants')
        .select('id')
        .eq('session_id', session.id)
        .eq('member_id', userId)
        .single();

      if (existingParticipant) {
        // User already joined, redirect to appropriate screen
        if (session.status === 'waiting') {
          navigate(`/quiz/waiting/${session.id}`);
        } else {
          navigate(`/quiz/play/${session.id}`);
        }
        return;
      }

      // Add user to session
      const { error: joinError } = await supabase
        .from('quiz_participants')
        .insert({
          session_id: session.id,
          member_id: userId,
          score: 0,
          joined_at: new Date().toISOString()
        });

      if (joinError) {
        console.error('Error joining session:', joinError);
        setError("Failed to join session. Please try again.");
        return;
      }

      // Navigate to waiting room
      navigate(`/quiz/waiting/${session.id}`);
      
    } catch (error) {
      console.error('Error joining quiz:', error);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Join Quiz — Vestry</title>
      </Helmet>

      <div className="min-h-screen bg-slate-900 relative overflow-hidden">
        {/* Animated background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            animate={{
              y: [0, 20, 0],
              x: [0, 10, 0]
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute top-10 left-10 w-32 h-32 bg-purple-500/12 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              y: [0, -15, 0],
              x: [0, -8, 0]
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute top-20 right-16 w-40 h-40 bg-indigo-500/12 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              y: [0, 25, 0],
              x: [0, 15, 0]
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute bottom-20 left-20 w-36 h-36 bg-blue-500/12 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              y: [0, -20, 0],
              x: [0, -12, 0]
            }}
            transition={{
              duration: 9,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute bottom-10 right-10 w-44 h-44 bg-purple-600/12 rounded-full blur-3xl"
          />
        </div>

        {/* Main content */}
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
          {/* Logo/Brand */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <div className="text-4xl font-bold text-white mb-2">
              CH
            </div>
            <div className="text-white/60 text-lg">
              Live Quiz
            </div>
          </motion.div>

          {/* Main card */}
          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 280,
              damping: 24
            }}
            className="bg-white rounded-3xl p-10 w-full max-w-md shadow-2xl"
          >
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                Enter Game PIN
              </h1>
              <p className="text-slate-600">
                Ask your host for the 6-character code
              </p>
            </div>

            <div className="mb-8">
              <PinEntry
                onComplete={handlePinSubmit}
                isLoading={isLoading}
                error={error}
              />
            </div>

            <Button
              onClick={() => {/* PIN entry handles submission */}}
              disabled={isLoading}
              className="w-full h-12 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                "Join Game"
              )}
            </Button>

            <p className="text-slate-500 text-sm text-center mt-6">
              Don't have a PIN? Ask your group leader or check the screen.
            </p>
          </motion.div>
        </div>
      </div>
    </>
  );
}