import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSubscription } from '@/hooks/useSubscription';
import { useChurch } from '@/contexts/ChurchContext';
import { PLANS, ADD_ONS } from '@/config/plans';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Check, Crown, Zap, Users, HardDrive, Mail, MessageSquare, Bot, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function Billing() {
  const { subscription, plan, limits, usage, isLoading } = useSubscription();
  const { tenantId } = useChurch();
  const [activeTab, setActiveTab] = useState('subscription');
  const [paymentModal, setPaymentModal] = useState<{ 
    show: boolean; 
    type: 'plan' | 'addon'; 
    item?: any; 
    price?: number; 
  }>({ show: false, type: 'plan' });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-32 bg-slate-200 rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const openPaymentModal = (type: 'plan' | 'addon', item: any, price: number) => {
    setPaymentModal({ show: true, type, item, price });
  };

  const getUsageColor = (percent: number) => {
    if (percent < 60) return 'bg-emerald-500';
    if (percent < 80) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getUsagePercent = (used: number, limit: number) => {
    return limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  };

  return (
    <div className="p-6 space-y-6 font-jakarta">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Billing & Subscription</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Manage your subscription plan and billing preferences
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="addons">Add-ons</TabsTrigger>
        </TabsList>

        <AnimatePresence mode="wait">
          <TabsContent key={activeTab} value="subscription" className="mt-6">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Current Plan Card */}
              <motion.div layout>
                <Card 
                  className="relative overflow-hidden"
                  style={{ 
                    boxShadow: `0 0 0 2px ${plan.color}40`,
                    borderColor: plan.color + '20'
                  }}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl" style={{ color: plan.color }}>
                          {plan.name} Plan
                        </CardTitle>
                        <p className="text-2xl font-bold text-slate-900 mt-1">
                          {plan.priceLabel}
                        </p>
                      </div>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        <Badge 
                          className="text-white font-semibold"
                          style={{ backgroundColor: plan.color }}
                        >
                          Current Plan
                        </Badge>
                      </motion.div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-2">Features</h4>
                        <ul className="space-y-1">
                          {plan.features.map((feature, index) => (
                            <li key={index} className="flex items-center gap-2 text-sm text-slate-600">
                              <Check className="h-4 w-4 text-emerald-500" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex items-center justify-center">
                        {plan.name === 'Pro' ? (
                          <div className="text-center">
                            <Crown className="h-12 w-12 text-amber-500 mx-auto mb-2" />
                            <p className="text-lg font-semibold text-slate-900">
                              You're on our best plan! 🎉
                            </p>
                          </div>
                        ) : (
                          <Button 
                            size="lg"
                            style={{ backgroundColor: plan.color }}
                            className="text-white hover:opacity-90"
                            onClick={() => {
                              const nextPlan = plan.name === 'Free' ? 'basic' : 
                                             plan.name === 'Basic' ? 'growth' : 'pro';
                              openPaymentModal('plan', PLANS[nextPlan], PLANS[nextPlan].price);
                            }}
                          >
                            <Zap className="h-4 w-4 mr-2" />
                            Upgrade Plan
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* All Plans Grid */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">All Plans</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Object.entries(PLANS).map(([key, planData], index) => {
                    const isCurrent = plan.name.toLowerCase() === key;
                    const isUpgrade = PLANS[key].price > plan.price;
                    const isDowngrade = PLANS[key].price < plan.price && PLANS[key].price > 0;
                    
                    return (
                      <motion.div
                        key={key}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.08, type: 'spring', stiffness: 300 }}
                        whileHover={!isCurrent ? { scale: 1.02, y: -4 } : {}}
                      >
                        <Card 
                          className={`relative h-full ${isCurrent ? 'ring-2' : 'hover:shadow-lg transition-shadow'}`}
                          style={isCurrent ? { 
                            ringColor: planData.color,
                            backgroundColor: planData.color + '05'
                          } : {}}
                        >
                          <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                              <CardTitle 
                                className="text-lg"
                                style={{ color: planData.color }}
                              >
                                {planData.name}
                              </CardTitle>
                              {key === 'growth' && !isCurrent && (
                                <Badge variant="secondary" className="text-xs">
                                  Most Popular
                                </Badge>
                              )}
                            </div>
                            <p className="text-xl font-bold text-slate-900">
                              {planData.priceLabel}
                            </p>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <ul className="space-y-1">
                              {planData.features.slice(0, 4).map((feature, idx) => (
                                <li key={idx} className="flex items-center gap-2 text-xs text-slate-600">
                                  <Check className="h-3 w-3 text-emerald-500" />
                                  {feature}
                                </li>
                              ))}
                            </ul>
                            
                            {!isCurrent && (
                              <Button 
                                className="w-full"
                                variant={isUpgrade ? "default" : "outline"}
                                style={isUpgrade ? { backgroundColor: planData.color } : {}}
                                onClick={() => openPaymentModal('plan', planData, planData.price)}
                              >
                                {isUpgrade ? 'Upgrade' : isDowngrade ? 'Downgrade' : 'Select'} to {planData.name}
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Usage Progress Bars */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Usage Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { label: 'Members', used: usage.members, limit: limits.members, icon: Users },
                    { label: 'Storage', used: usage.storage_gb, limit: limits.storage_gb, icon: HardDrive, unit: 'GB' },
                    { label: 'SMS Credits', used: usage.sms, limit: limits.sms, icon: MessageSquare },
                    { label: 'Email Credits', used: usage.email, limit: limits.email, icon: Mail },
                    { label: 'AI Credits', used: usage.ai, limit: limits.ai, icon: Bot },
                  ].map((item, index) => {
                    const percent = getUsagePercent(item.used, item.limit);
                    const colorClass = getUsageColor(percent);
                    
                    return (
                      <motion.div
                        key={item.label}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1, type: 'spring' }}
                      >
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3 mb-3">
                              <item.icon className="h-5 w-5 text-slate-500" />
                              <span className="font-medium text-slate-900">{item.label}</span>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-600">
                                  {item.used.toLocaleString()}{item.unit ? ` ${item.unit}` : ''} used
                                </span>
                                <span className="text-slate-500">
                                  {item.limit.toLocaleString()}{item.unit ? ` ${item.unit}` : ''} limit
                                </span>
                              </div>
                              <div className="relative h-2 bg-slate-200 rounded-full overflow-hidden">
                                <motion.div
                                  className={`h-full ${colorClass} rounded-full`}
                                  initial={{ width: '0%' }}
                                  animate={{ width: `${percent}%` }}
                                  transition={{ duration: 1, type: 'spring', stiffness: 100 }}
                                />
                              </div>
                              <p className="text-xs text-slate-500">
                                {percent.toFixed(1)}% used
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Billing History */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Billing History</h3>
                <Card>
                  <CardContent className="p-8 text-center">
                    <div className="text-slate-400 mb-2">📄</div>
                    <p className="text-slate-600 mb-1">No billing history yet</p>
                    <p className="text-sm text-slate-500">
                      Your payment history will appear here once you make your first payment.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent key="addons" value="addons">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Add-ons</h3>
                <p className="text-sm text-slate-500 mb-6">
                  Boost your plan with additional capacity when you need it.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ADD_ONS.map((addon, index) => {
                  const currentAddons = subscription?.[addon.key] ?? 0;
                  
                  return (
                    <motion.div
                      key={addon.key}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.08, type: 'spring', stiffness: 300 }}
                      whileHover={{ scale: 1.02, y: -4 }}
                    >
                      <Card className="h-full hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-4">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{addon.icon}</span>
                            <div>
                              <CardTitle className="text-lg">{addon.label}</CardTitle>
                              <p className="text-sm text-slate-500">{addon.unit}</p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-slate-900">
                              KSh {addon.price.toLocaleString()}
                            </p>
                            <p className="text-sm text-slate-500">per month</p>
                          </div>
                          
                          {currentAddons > 0 && (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                              <p className="text-sm text-emerald-700 font-medium">
                                You have +{currentAddons.toLocaleString()} from add-ons
                              </p>
                            </div>
                          )}
                          
                          <Button 
                            className="w-full"
                            onClick={() => openPaymentModal('addon', addon, addon.price)}
                          >
                            Buy {addon.unit}
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </TabsContent>
        </AnimatePresence>
      </Tabs>

      {/* Payment Modal */}
      <Dialog open={paymentModal.show} onOpenChange={(open) => setPaymentModal(prev => ({ ...prev, show: open }))}>
        <DialogContent className="max-w-md">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <DialogHeader>
              <DialogTitle>
                {paymentModal.type === 'plan' ? 'Upgrade Plan' : 'Purchase Add-on'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-slate-900">
                  {paymentModal.type === 'plan' 
                    ? `${paymentModal.item?.name} Plan` 
                    : paymentModal.item?.label
                  }
                </h3>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  KSh {paymentModal.price?.toLocaleString()}
                  {paymentModal.type === 'plan' ? '/month' : '/month'}
                </p>
              </div>

              <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-slate-900">Payment Instructions</h4>
                <div className="space-y-2 text-sm text-slate-600">
                  <p>1. Go to M-Pesa on your phone</p>
                  <p>2. Select "Lipa na M-Pesa" → "Pay Bill"</p>
                  <p>3. Enter Business Number: <span className="font-mono font-semibold">000000</span></p>
                  <p>4. Enter Account Number: <span className="font-mono font-semibold">{tenantId?.slice(0, 8).toUpperCase()}</span></p>
                  <p>5. Enter Amount: <span className="font-semibold">KSh {paymentModal.price?.toLocaleString()}</span></p>
                  <p>6. Complete the transaction</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <p className="text-xs text-blue-700">
                    Your plan will be activated within 24 hours after payment confirmation.
                  </p>
                </div>
              </div>

              <Button 
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                onClick={() => {
                  const message = `I've paid for the ${paymentModal.type === 'plan' ? paymentModal.item?.name + ' plan' : paymentModal.item?.label}. Reference: ${tenantId?.slice(0, 8).toUpperCase()}`;
                  window.open(`https://wa.me/254XXXXXXXXX?text=${encodeURIComponent(message)}`, '_blank');
                }}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Confirm Payment via WhatsApp
              </Button>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>
    </div>
  );
}