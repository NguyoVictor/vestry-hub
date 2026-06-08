import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useMemberPortal } from "@/contexts/MemberPortalContext";
import { Helmet } from "react-helmet-async";

const MemberWelcome = () => {
  const navigate = useNavigate();
  const member = useMemberPortal();

  // Auto redirect after 2.5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/member');
    }, 2500);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <>
      <Helmet>
        <title>Welcome — Vestry</title>
      </Helmet>
      
      <div 
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0f0f13 0%, #1a1030 50%, #0f0f13 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Background particles effect */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `radial-gradient(circle at 20% 50%, rgba(124, 58, 237, 0.1) 0%, transparent 50%), 
                              radial-gradient(circle at 80% 20%, rgba(249, 115, 22, 0.1) 0%, transparent 50%), 
                              radial-gradient(circle at 40% 80%, rgba(124, 58, 237, 0.08) 0%, transparent 50%)`,
            pointerEvents: 'none'
          }}
        />

        {/* Main content */}
        <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          {/* VestryHub logo */}
          <motion.img
            src="https://crjdsxxkspvdwknrmijs.supabase.co/storage/v1/object/public/brand/logo.jpeg"
            alt="VestryHub"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{
              height: 48,
              marginBottom: 40,
              borderRadius: 8,
              filter: 'brightness(1.1)'
            }}
          />

          {/* Animated waving hand */}
          <motion.div
            animate={{ rotate: [0, 20, -10, 20, 0] }}
            transition={{ duration: 1.2, ease: "easeInOut", delay: 0.4 }}
            style={{ 
              fontSize: 64, 
              display: 'inline-block', 
              transformOrigin: '70% 70%',
              marginBottom: 24
            }}
          >
            👋
          </motion.div>

          {/* Welcome text */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            style={{ 
              color: '#a1a1aa', 
              fontSize: 16, 
              margin: '24px 0 8px',
              fontWeight: 400,
              letterSpacing: '0.5px'
            }}
          >
            Welcome,
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            style={{ 
              color: '#ffffff', 
              fontSize: 36, 
              fontWeight: 700, 
              letterSpacing: -1, 
              margin: 0,
              background: 'linear-gradient(135deg, #ffffff 0%, #e5e7eb 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            {member.firstName} {member.lastName}.
          </motion.h1>

          {/* Church name badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.0 }}
            style={{
              marginTop: 16,
              background: 'rgba(124,58,237,0.2)',
              border: '1px solid rgba(124,58,237,0.4)',
              borderRadius: 999,
              padding: '6px 20px',
              color: '#a78bfa',
              fontSize: 14,
              fontWeight: 500,
              display: 'inline-block',
              backdropFilter: 'blur(8px)'
            }}
          >
            {member.churchName}
          </motion.div>

          {/* Loading indicator text */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            style={{
              color: '#6b7280',
              fontSize: 14,
              marginTop: 40,
              fontWeight: 400
            }}
          >
            Setting up your dashboard...
          </motion.p>
        </div>

        {/* Loading bar at bottom */}
        <motion.div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            height: 3,
            background: 'linear-gradient(90deg, #7c3aed, #f97316)',
            borderRadius: 999,
          }}
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 2.5, ease: 'linear' }}
        />
      </div>
    </>
  );
};

export default MemberWelcome;