import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex flex-col items-center justify-center px-6 py-12 font-jakarta relative overflow-hidden">
      {/* Subtle geometric background */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 border border-slate-300 rounded-full" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 border border-slate-300 rounded-full" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-slate-300 rounded-full" />
      </div>
      
      {/* Main content */}
      <div className="relative z-10 text-center max-w-lg mx-auto">
        {/* Animated 404 */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mb-12"
        >
          <div className="relative">
            <h1 className="text-[140px] md:text-[180px] font-bold text-transparent bg-clip-text bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 select-none tracking-tighter leading-none">
              404
            </h1>
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-violet-500 to-orange-500 rounded-full"
            />
          </div>
        </motion.div>

        {/* Typography-focused message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mb-10 space-y-4"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
            Lost in the digital sanctuary
          </h2>
          <p className="text-lg text-slate-600 leading-relaxed max-w-md mx-auto">
            The page you're seeking has wandered off the path. Let's guide you back to familiar ground.
          </p>
        </motion.div>

        {/* Premium action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          {/* Primary button */}
          <motion.button
            whileHover={{ 
              scale: 1.02, 
              y: -2,
              boxShadow: "0 10px 40px rgba(139, 92, 246, 0.3)"
            }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={() => navigate('/dashboard')}
            className="group relative inline-flex items-center justify-center gap-3 bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white px-8 py-4 rounded-2xl font-semibold text-base shadow-lg transition-all duration-300"
          >
            <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform duration-200" />
            Return to Dashboard
          </motion.button>

          {/* Secondary button */}
          <motion.button
            whileHover={{ 
              scale: 1.02, 
              y: -2,
              backgroundColor: "rgba(248, 250, 252, 0.8)",
              borderColor: "rgba(139, 92, 246, 0.3)"
            }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={() => navigate('/')}
            className="group inline-flex items-center justify-center gap-3 bg-white/60 backdrop-blur-sm border-2 border-slate-200 hover:border-violet-300 text-slate-700 hover:text-violet-700 px-8 py-4 rounded-2xl font-semibold text-base shadow-sm transition-all duration-300"
          >
            <Home className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
            Go Home
          </motion.button>
        </motion.div>

        {/* Elegant brand signature */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="mt-16 pt-8 border-t border-slate-200"
        >
          <p className="text-sm text-slate-400 tracking-wide">
            Crafted with care by{" "}
            <span className="font-semibold bg-gradient-to-r from-violet-600 to-orange-500 bg-clip-text text-transparent">
              VestryHub
            </span>
          </p>
        </motion.div>
      </div>

      {/* Floating elements */}
      <motion.div
        animate={{ 
          y: [0, -20, 0],
          rotate: [0, 5, 0]
        }}
        transition={{ 
          duration: 6, 
          repeat: Infinity, 
          ease: "easeInOut"
        }}
        className="absolute top-20 right-20 w-3 h-3 bg-gradient-to-br from-violet-400 to-violet-500 rounded-full opacity-60"
      />
      
      <motion.div
        animate={{ 
          y: [0, 15, 0],
          rotate: [0, -3, 0]
        }}
        transition={{ 
          duration: 8, 
          repeat: Infinity, 
          ease: "easeInOut",
          delay: 2
        }}
        className="absolute bottom-32 left-20 w-2 h-2 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full opacity-50"
      />

      <motion.div
        animate={{ 
          y: [0, -10, 0],
          x: [0, 5, 0]
        }}
        transition={{ 
          duration: 7, 
          repeat: Infinity, 
          ease: "easeInOut",
          delay: 4
        }}
        className="absolute top-1/2 right-10 w-1.5 h-1.5 bg-gradient-to-br from-violet-300 to-orange-300 rounded-full opacity-40"
      />
    </div>
  );
};

export default NotFound;