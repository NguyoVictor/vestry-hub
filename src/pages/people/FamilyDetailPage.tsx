import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useChurch } from '@/contexts/ChurchContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Users, FileText, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FamilyMembersTab from '@/components/families/FamilyMembersTab';
import FamilyNotesTab from '@/components/families/FamilyNotesTab';
import FamilyActivityTab from '@/components/families/FamilyActivityTab';

type TabType = 'members' | 'notes' | 'activity';

export default function FamilyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tenantId } = useChurch();
  const [activeTab, setActiveTab] = useState<TabType>('members');

  const { data: family, isLoading } = useQuery({
    queryKey: ['family', id, tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('families')
        .select('*')
        .eq('id', id!)
        .eq('tenant_id', tenantId!)
        .single();
      if (error) throw error;

      // Fetch family members
      const { data: membersData } = await supabase
        .from('family_members')
        .select('*')
        .eq('family_id', id!);

      return { ...data, members: membersData || [] };
    },
    enabled: !!id && !!tenantId,
    staleTime: 300000,
  });

  const tabs = [
    { id: 'members' as TabType, label: 'Members', icon: Users },
    { id: 'notes' as TabType, label: 'Notes', icon: FileText },
    { id: 'activity' as TabType, label: 'Activity', icon: Activity },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  if (!family) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-slate-500 font-jakarta">Family not found</p>
        <Button onClick={() => navigate('/families')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />Back to Families
        </Button>
      </div>
    );
  }

  return (
    <>
      <Helmet><title>{family.name} — Vestry</title></Helmet>

      <div className="space-y-6 font-jakarta">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/families')}
              className="mb-2 -ml-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />Families
            </Button>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {family.name}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {family.members?.length || 0} members
            </p>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="border-b border-slate-200 dark:border-slate-700">
          <div className="flex gap-6 relative">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'members' && <FamilyMembersTab family={family} />}
            {activeTab === 'notes' && <FamilyNotesTab family={family} />}
            {activeTab === 'activity' && <FamilyActivityTab family={family} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}
