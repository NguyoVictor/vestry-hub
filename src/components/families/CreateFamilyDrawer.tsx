import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface FamilyMemberRow {
  first_name: string;
  middle_name: string;
  last_name: string;
  suffix: string;
  gender: string;
  role: string;
  birth_month: string;
  birth_day: string;
  birth_year: string;
  classification: string;
}

interface CreateFamilyDrawerProps {
  onClose: () => void;
  onSuccess: (data: { name: string; members: FamilyMemberRow[] }) => void;
  initialData?: { name: string; members: FamilyMemberRow[] };
  isEdit?: boolean;
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const ROLES = ["Head","Spouse","Child","Parent","Sibling","Other"];
const GENDERS = ["Male","Female","Other"];
const CLASSIFICATIONS = ["Member","Visitor","Unassigned"];

const emptyMember = (): FamilyMemberRow => ({
  first_name: "", middle_name: "", last_name: "", suffix: "",
  gender: "", role: "", birth_month: "", birth_day: "", birth_year: "",
  classification: "Unassigned",
});

export default function CreateFamilyDrawer({ onClose, onSuccess, initialData, isEdit }: CreateFamilyDrawerProps) {
  const [step, setStep] = useState(1);
  const [familyName, setFamilyName] = useState(initialData?.name || '');
  const [members, setMembers] = useState<FamilyMemberRow[]>(
    initialData?.members && initialData.members.length > 0
      ? initialData.members
      : [emptyMember()]
  );

  const updateMember = (idx: number, field: keyof FamilyMemberRow, value: string) => {
    setMembers(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  };

  const addMember = () => {
    setMembers(prev => [...prev, emptyMember()]);
  };

  const removeMember = (idx: number) => {
    if (members.length > 1) {
      setMembers(prev => prev.filter((_, i) => i !== idx));
    }
  };

  const handleSubmit = () => {
    if (!familyName.trim()) {
      alert('Family name is required');
      return;
    }
    onSuccess({ name: familyName, members });
  };

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed right-0 top-0 h-full w-full sm:w-[520px] bg-white dark:bg-slate-900 z-50 shadow-xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 font-jakarta">
              {isEdit ? 'Edit Family' : 'Create Family'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-jakarta">
              Step {step} of 2
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Progress Indicator */}
        <div className="flex gap-2 px-6 py-3 bg-slate-50 dark:bg-slate-800/50">
          <div className={`h-1.5 flex-1 rounded-full transition-colors ${step >= 1 ? 'bg-orange-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
          <div className={`h-1.5 flex-1 rounded-full transition-colors ${step >= 2 ? 'bg-orange-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="familyName" className="text-sm font-medium text-slate-700 dark:text-slate-300 font-jakarta">
                    Family Name *
                  </Label>
                  <Input
                    id="familyName"
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                    placeholder="e.g. The Kamau Family"
                    className="mt-1.5 h-10 border-slate-200 dark:border-slate-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 font-jakarta"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-jakarta">
                    This will be the display name for this family unit
                  </p>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1 font-jakarta">
                    Add Family Members
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-jakarta">
                    Add members to this family. You can add more later.
                  </p>
                </div>

                <div className="space-y-3">
                  {members.map((member, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-3 border border-slate-200 dark:border-slate-700"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide font-jakarta">
                          Member {idx + 1}
                        </span>
                        {members.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => removeMember(idx)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs font-jakarta">First Name</Label>
                          <Input
                            value={member.first_name}
                            onChange={(e) => updateMember(idx, 'first_name', e.target.value)}
                            className="mt-1 h-9 text-sm font-jakarta"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-jakarta">Last Name</Label>
                          <Input
                            value={member.last_name}
                            onChange={(e) => updateMember(idx, 'last_name', e.target.value)}
                            className="mt-1 h-9 text-sm font-jakarta"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs font-jakarta">Role</Label>
                          <Select value={member.role || undefined} onValueChange={(v) => updateMember(idx, 'role', v)}>
                            <SelectTrigger className="mt-1 h-9 text-sm font-jakarta">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs font-jakarta">Gender</Label>
                          <Select value={member.gender || undefined} onValueChange={(v) => updateMember(idx, 'gender', v)}>
                            <SelectTrigger className="mt-1 h-9 text-sm font-jakarta">
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                            <SelectContent>
                              {GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 font-jakarta"
                  onClick={addMember}
                >
                  <Plus className="h-4 w-4" />Add Another Member
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex gap-3">
          {step === 1 ? (
            <>
              <Button variant="outline" className="flex-1 font-jakarta" onClick={onClose}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-jakarta"
                onClick={() => setStep(2)}
                disabled={!familyName.trim()}
              >
                Next
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" className="flex-1 font-jakarta" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />Back
              </Button>
              <Button
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-jakarta"
                onClick={handleSubmit}
              >
                {isEdit ? 'Update Family' : 'Create Family'}
              </Button>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
