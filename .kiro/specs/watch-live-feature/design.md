# Watch Live Feature — Design

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     ADMIN SIDE                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Livestreaming.tsx (Enhanced)                          │ │
│  │  - Go Live Panel                                       │ │
│  │  - Schedule Management                                 │ │
│  │  - Recordings Management                               │ │
│  └────────────────────────────────────────────────────────┘ │
│                          │                                   │
│                          │ Mutation: is_live = true          │
│                          ▼                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Supabase: livestream_schedules                        │ │
│  │  - stream_provider, stream_url, jitsi_room             │ │
│  │  - is_live, viewer_count, chat_enabled                 │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ Realtime UPDATE event
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    MEMBER SIDE                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  MemberWatchLive.tsx                                   │ │
│  │  ┌──────────────────┐  ┌──────────────────┐           │ │
│  │  │  STATE 1: LIVE   │  │ STATE 2: NOT LIVE│           │ │
│  │  │  - Stream Player │  │ - Countdown Timer│           │ │
│  │  │  - Live Chat     │  │ - Next Service   │           │ │
│  │  │  - Reactions     │  │ - Recordings     │           │ │
│  │  └──────────────────┘  └──────────────────┘           │ │
│  └────────────────────────────────────────────────────────┘ │
│                          │                                   │
│                          │ Realtime INSERT event             │
│                          ▼                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Supabase: live_chat_messages                          │ │
│  │  - message, reaction, member_name                      │ │
│  │  - is_pinned, is_admin                                 │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Hierarchy

### Admin Side

```
Livestreaming.tsx (Enhanced)
├── BlurFadeIn (page wrapper)
├── PageHeader
│   ├── Title + Icon
│   ├── LiveBadge (conditional)
│   └── ActionButtons (Go Live | End Stream)
├── StatsRow
│   ├── StatCard (Total Streams)
│   ├── StatCard (Live Now)
│   ├── StatCard (Total Recordings)
│   └── StatCard (Total Viewers)
├── GoLivePanel (conditional: !isLive)
│   ├── ServiceTitleInput
│   ├── ProviderSelector
│   │   ├── ProviderCard (YouTube)
│   │   ├── ProviderCard (Facebook)
│   │   ├── ProviderCard (Jitsi)
│   │   └── ProviderCard (Custom)
│   ├── StreamURLInput (conditional)
│   ├── ServiceDetailsCollapsible
│   │   ├── PastorNameInput
│   │   ├── SeriesNameInput
│   │   └── ScriptureInput
│   ├── ChatEnabledToggle
│   └── GoLiveButton
├── Tabs
│   ├── ScheduledServicesTab
│   │   ├── ScheduleTable
│   │   └── ScheduleDialog
│   └── RecordingsTab
│       ├── RecordingsTable
│       └── AddRecordingDialog
└── (Existing: Prayer Wall, Analytics)
```

### Member Side

```
MemberWatchLive.tsx (NEW)
├── BlurFadeIn (page wrapper)
├── Helmet (page title)
├── StateManager (query is_live)
│   ├── STATE 1: Live
│   │   ├── TwoColumnLayout
│   │   │   ├── LeftColumn
│   │   │   │   ├── StreamPlayer
│   │   │   │   │   ├── ProviderIframe
│   │   │   │   │   ├── LiveBadge (overlay)
│   │   │   │   │   └── ViewerCount (overlay)
│   │   │   │   └── ServiceInfo
│   │   │   │       ├── ChurchName
│   │   │   │       ├── ServiceTitle
│   │   │   │       └── MetadataRow
│   │   │   └── RightColumn
│   │   │       └── LiveChatPanel
│   │   │           ├── ChatHeader
│   │   │           ├── MessagesArea
│   │   │           │   └── ChatMessage[]
│   │   │           ├── ReactionsBar
│   │   │           └── MessageInput
│   │   └── RealtimeSubscription (chat)
│   └── STATE 2: Not Live
│       ├── HeroSection
│       │   ├── AnimatedIcon
│       │   ├── Heading
│       │   └── Subtext
│       ├── NextServiceCard (conditional)
│       │   ├── ServiceTitle
│       │   ├── DateTime
│       │   ├── CountdownTimer
│       │   │   ├── DaysUnit
│       │   │   ├── HoursUnit
│       │   │   ├── MinutesUnit
│       │   │   └── SecondsUnit
│       │   └── NotifyButton
│       ├── RecentRecordingsStrip
│       │   └── RecordingCard[]
│       └── Tabs
│           ├── LiveTab (shows above)
│           └── RecordingsTab
│               ├── FilterRow
│               ├── RecordingsGrid
│               │   └── RecordingCard[]
│               └── VideoModal
└── RealtimeSubscription (live status)
```

---

## Data Flow

### 1. Admin Goes Live

```
User Action: Click "Go Live Now"
    ↓
Validate Form (title, provider, URL)
    ↓
Mutation: INSERT or UPDATE livestream_schedules
    {
      title: "Sunday Morning Service",
      stream_provider: "jitsi",
      jitsi_room: "vestryhub-live-abc123",
      is_live: true,
      chat_enabled: true,
      pastor_name: "Pastor John",
      series_name: "Faith Series",
      scripture: "John 3:16"
    }
    ↓
Supabase Realtime: Broadcast UPDATE event
    ↓
Member Pages: Receive event → Transition to STATE 1
    ↓
Notification: Send "We Are Live" to all members
    ↓
Toast: "You are now live!"
```

### 2. Member Watches Stream

```
Page Load: Query livestream_schedules WHERE is_live = true
    ↓
Result Found? → STATE 1 (Live)
    ↓
Render StreamPlayer with provider-specific iframe
    ↓
Subscribe to live_chat_messages WHERE stream_id = [id]
    ↓
Display Messages in Real-Time
    ↓
User Sends Message:
    ↓
Optimistic UI: Show message immediately
    ↓
Mutation: INSERT live_chat_messages
    {
      stream_id: "...",
      member_id: "...",
      member_name: "John Doe",
      message: "Amen!",
      is_admin: false
    }
    ↓
Supabase Realtime: Broadcast INSERT event
    ↓
All Viewers: Receive message → Append to chat
```

### 3. Admin Ends Stream

```
User Action: Click "End Stream"
    ↓
Mutation: UPDATE livestream_schedules
    {
      is_live: false,
      ended_at: now(),
      viewer_count: [final count]
    }
    ↓
Supabase Realtime: Broadcast UPDATE event
    ↓
Member Pages: Receive event → Transition to STATE 2
    ↓
Toast: "The live service has ended"
    ↓
Stream Archived: Appears in Recordings tab
```

### 4. Countdown Timer

```
Page Load: Query livestream_schedules WHERE start_time > now()
    ↓
Calculate Time Remaining:
    const now = new Date()
    const start = new Date(schedule.start_time)
    const diff = start - now
    ↓
Convert to Units:
    days = Math.floor(diff / (1000 * 60 * 60 * 24))
    hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    seconds = Math.floor((diff % (1000 * 60)) / 1000)
    ↓
Update Every Second:
    useEffect(() => {
      const interval = setInterval(() => {
        setTimeRemaining(calculateTimeRemaining())
      }, 1000)
      return () => clearInterval(interval)
    }, [schedule.start_time])
    ↓
Animate Number Changes:
    <motion.span key={seconds} initial={{ scale: 1.2 }} animate={{ scale: 1 }} />
```

---

## UI/UX Design Patterns

### Color Palette

```css
/* Live Indicators */
--live-red: #ef4444;
--live-red-glow: rgba(239, 68, 68, 0.3);

/* Primary Actions */
--primary: #7c3aed; /* violet-600 */
--primary-hover: #6d28d9; /* violet-700 */

/* Chat */
--chat-bg: #ffffff;
--chat-bg-dark: #1e293b;
--chat-border: #e2e8f0;
--chat-border-dark: #334155;
--message-hover: #f8fafc;
--message-hover-dark: #334155;

/* Reactions */
--reaction-bg: #f1f5f9;
--reaction-bg-dark: #334155;
--reaction-hover: #e2e8f0;
--reaction-hover-dark: #475569;

/* Countdown */
--countdown-bg: #f1f5f9;
--countdown-bg-dark: #1e293b;
--countdown-text: #0f172a;
--countdown-text-dark: #f1f5f9;
```

### Typography

```css
/* Page Titles */
.page-title {
  font-size: 1.875rem; /* 30px */
  font-weight: 700;
  letter-spacing: -0.01em;
}

/* Service Titles */
.service-title {
  font-size: 1.25rem; /* 20px */
  font-weight: 600;
  line-height: 1.4;
}

/* Chat Messages */
.chat-message {
  font-size: 0.875rem; /* 14px */
  font-weight: 400;
  line-height: 1.5;
}

/* Countdown Numbers */
.countdown-number {
  font-size: 2rem; /* 32px */
  font-weight: 700;
  font-family: 'Courier New', monospace;
}

/* Countdown Labels */
.countdown-label {
  font-size: 0.75rem; /* 12px */
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

### Spacing

```css
/* Page Padding */
.page-container {
  padding: 1.5rem; /* 24px */
}

/* Card Padding */
.card-padding {
  padding: 1.5rem; /* 24px */
}

/* Section Gaps */
.section-gap {
  gap: 1.5rem; /* 24px */
}

/* Element Gaps */
.element-gap {
  gap: 0.75rem; /* 12px */
}

/* Chat Message Spacing */
.chat-spacing {
  gap: 0.75rem; /* 12px */
  padding: 0.75rem; /* 12px */
}
```

### Animations

```typescript
// Page Entrance
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 }
}

// Live Badge Pulse
const livePulse = {
  animate: { opacity: [1, 0.4, 1] },
  transition: { repeat: Infinity, duration: 1.5 }
}

// Chat Message Entry
const messageEntry = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { type: 'spring', stiffness: 400, damping: 25 }
}

// Countdown Number Change
const numberChange = {
  initial: { scale: 1.2, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  transition: { type: 'spring', stiffness: 400, damping: 25 }
}

// Recording Card Hover
const cardHover = {
  whileHover: { y: -4 },
  transition: { type: 'spring', stiffness: 400, damping: 25 }
}

// Button Press
const buttonPress = {
  whileTap: { scale: 0.97 }
}
```

---

## Responsive Breakpoints

```typescript
// Mobile: < 640px
// Tablet: 640px - 1024px
// Desktop: > 1024px

// Live Stream Layout
const layoutClasses = {
  mobile: 'flex flex-col gap-4',
  tablet: 'flex flex-col gap-6',
  desktop: 'flex flex-row gap-6'
}

// Player Column
const playerClasses = {
  mobile: 'w-full',
  tablet: 'w-full',
  desktop: 'flex-1 min-w-0'
}

// Chat Column
const chatClasses = {
  mobile: 'w-full h-96',
  tablet: 'w-full h-96',
  desktop: 'w-96 flex-shrink-0 h-[600px]'
}

// Recordings Grid
const gridClasses = {
  mobile: 'grid-cols-1',
  tablet: 'grid-cols-2',
  desktop: 'grid-cols-3'
}
```

---

## Component Specifications

### StreamPlayer Component

```typescript
interface StreamPlayerProps {
  provider: 'youtube' | 'facebook' | 'jitsi' | 'custom';
  streamUrl?: string;
  jitsiRoom?: string;
  isLive: boolean;
  viewerCount: number;
}

// YouTube
<iframe
  src={`${streamUrl}?autoplay=1`}
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
  allowFullScreen
/>

// Facebook
<iframe
  src={`https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(streamUrl)}`}
  allowFullScreen
/>

// Jitsi
<iframe
  src={`https://jitsi.riot.im/${jitsiRoom}#config.prejoinPageEnabled=false&config.lobby.enabled=false`}
  allow="camera; microphone; fullscreen; display-capture"
/>

// Custom
<iframe src={streamUrl} allowFullScreen />
```

### LiveChatPanel Component

```typescript
interface LiveChatPanelProps {
  streamId: string;
  tenantId: string;
  chatEnabled: boolean;
}

// Realtime Subscription
useEffect(() => {
  const channel = supabase
    .channel(`chat:${streamId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'live_chat_messages',
      filter: `stream_id=eq.${streamId}`
    }, (payload) => {
      setMessages(prev => [...prev, payload.new])
      scrollToBottom()
    })
    .subscribe()
  
  return () => supabase.removeChannel(channel)
}, [streamId])

// Send Message
const sendMessage = async (text: string) => {
  // Optimistic UI
  const tempMessage = {
    id: crypto.randomUUID(),
    message: text,
    member_name: member.name,
    created_at: new Date().toISOString(),
    is_admin: false
  }
  setMessages(prev => [...prev, tempMessage])
  
  // Insert to database
  await supabase.from('live_chat_messages').insert({
    stream_id: streamId,
    tenant_id: tenantId,
    member_id: member.id,
    member_name: member.name,
    message: text
  })
}
```

### CountdownTimer Component

```typescript
interface CountdownTimerProps {
  targetDate: string;
}

const CountdownTimer = ({ targetDate }: CountdownTimerProps) => {
  const [timeRemaining, setTimeRemaining] = useState(calculateTimeRemaining())
  
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining())
    }, 1000)
    
    return () => clearInterval(interval)
  }, [targetDate])
  
  const calculateTimeRemaining = () => {
    const now = new Date().getTime()
    const target = new Date(targetDate).getTime()
    const diff = target - now
    
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 }
    
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000)
    }
  }
  
  return (
    <div className="grid grid-cols-4 gap-4">
      {Object.entries(timeRemaining).map(([unit, value]) => (
        <div key={unit} className="rounded-xl bg-muted p-3 text-center">
          <motion.span
            key={value}
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-2xl font-bold font-mono"
          >
            {String(value).padStart(2, '0')}
          </motion.span>
          <p className="text-xs text-muted-foreground uppercase mt-1">
            {unit}
          </p>
        </div>
      ))}
    </div>
  )
}
```

### RecordingCard Component

```typescript
interface RecordingCardProps {
  id: string;
  title: string;
  thumbnailUrl?: string;
  duration: number; // seconds
  streamDate: string;
  seriesName?: string;
  viewCount: number;
  onClick: () => void;
}

const RecordingCard = ({ ...props }: RecordingCardProps) => {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${String(secs).padStart(2, '0')}`
  }
  
  return (
    <motion.div
      whileHover={{ y: -4 }}
      onClick={props.onClick}
      className="rounded-2xl overflow-hidden border bg-card cursor-pointer group"
    >
      <div className="aspect-video relative">
        {props.thumbnailUrl ? (
          <img
            src={props.thumbnailUrl}
            alt={props.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-violet-600 to-violet-900 flex items-center justify-center">
            <Play className="h-12 w-12 text-white/50" />
          </div>
        )}
        
        {/* Hover Overlay */}
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            className="absolute inset-0 bg-black/50 flex items-center justify-center"
          >
            <motion.div
              whileHover={{ scale: 1.1 }}
              className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center"
            >
              <Play className="h-6 w-6 text-white" />
            </motion.div>
          </motion.div>
        </AnimatePresence>
        
        {/* Duration Chip */}
        <div className="absolute bottom-2 right-2 bg-black/70 text-white rounded-lg px-2 py-0.5 text-xs">
          {formatDuration(props.duration)}
        </div>
      </div>
      
      <div className="p-3">
        <h3 className="font-medium text-sm line-clamp-2">{props.title}</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {format(new Date(props.streamDate), 'MMM d, yyyy')}
        </p>
        {props.seriesName && (
          <span className="inline-flex items-center rounded-full bg-violet-100 dark:bg-violet-900/20 px-2 py-0.5 text-xs text-violet-700 dark:text-violet-300 mt-1">
            {props.seriesName}
          </span>
        )}
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
          <Eye className="h-3 w-3" />
          {props.viewCount}
        </div>
      </div>
    </motion.div>
  )
}
```

---

## Database Queries

### Check if Live

```typescript
const { data: liveStream } = useQuery({
  queryKey: ['live_stream', tenantId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from(TABLES.LIVESTREAM_SCHEDULES)
      .select('*')
      .eq(COLS.TENANT_ID, tenantId)
      .eq('is_live', true)
      .limit(1)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data
  },
  staleTime: 300000
})
```

### Get Next Scheduled Service

```typescript
const { data: nextService } = useQuery({
  queryKey: ['next_service', tenantId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from(TABLES.LIVESTREAM_SCHEDULES)
      .select('*')
      .eq(COLS.TENANT_ID, tenantId)
      .eq('is_live', false)
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(1)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data
  },
  staleTime: 300000
})
```

### Get Recent Recordings

```typescript
const { data: recordings } = useQuery({
  queryKey: ['recordings', tenantId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from(TABLES.LIVESTREAM_SCHEDULES)
      .select('*')
      .eq(COLS.TENANT_ID, tenantId)
      .not('ended_at', 'is', null)
      .not('recording_url', 'is', null)
      .order('ended_at', { ascending: false })
      .limit(10)
    
    if (error) throw error
    return data
  },
  staleTime: 300000
})
```

### Get Chat Messages

```typescript
const { data: messages } = useQuery({
  queryKey: ['chat_messages', streamId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('live_chat_messages')
      .select('*')
      .eq('stream_id', streamId)
      .order('created_at', { ascending: true })
      .limit(100)
    
    if (error) throw error
    return data
  },
  staleTime: 300000
})
```

---

## Error Handling

### Stream Player Errors

```typescript
// YouTube iframe fails to load
<div className="aspect-video bg-black flex items-center justify-center">
  <div className="text-center text-white">
    <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
    <p className="text-sm">Unable to load stream</p>
    <Button size="sm" variant="outline" className="mt-3" onClick={retry}>
      Retry
    </Button>
  </div>
</div>
```

### Chat Connection Errors

```typescript
// Realtime subscription fails
<div className="p-4 text-center">
  <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
  <p className="text-sm text-muted-foreground">
    Chat temporarily unavailable
  </p>
  <Button size="sm" variant="outline" className="mt-2" onClick={reconnect}>
    Reconnect
  </Button>
</div>
```

### No Recordings

```typescript
<div className="flex flex-col items-center justify-center py-16">
  <Video className="h-12 w-12 text-muted-foreground/30 mb-3" />
  <p className="text-sm font-medium text-muted-foreground">
    No recordings yet
  </p>
  <p className="text-xs text-muted-foreground/70 mt-1">
    Past live services will appear here after they are recorded
  </p>
</div>
```

---

## Performance Optimizations

### 1. Lazy Loading
```typescript
// Lazy load video modal
const VideoModal = lazy(() => import('@/components/shared/VideoModal'))

// Lazy load recordings tab
const RecordingsTab = lazy(() => import('@/components/shared/RecordingsTab'))
```

### 2. Memoization
```typescript
// Memoize expensive calculations
const timeRemaining = useMemo(() => 
  calculateTimeRemaining(targetDate), 
  [targetDate, currentTime]
)

// Memoize filtered messages
const filteredMessages = useMemo(() => 
  messages.filter(m => !m.is_deleted), 
  [messages]
)
```

### 3. Virtualization
```typescript
// For long chat message lists (future enhancement)
import { useVirtualizer } from '@tanstack/react-virtual'

const virtualizer = useVirtualizer({
  count: messages.length,
  getScrollElement: () => scrollRef.current,
  estimateSize: () => 60
})
```

### 4. Debouncing
```typescript
// Debounce chat input
const debouncedSendMessage = useMemo(
  () => debounce(sendMessage, 300),
  [sendMessage]
)
```

---

## Accessibility

### Keyboard Navigation
- Tab through all interactive elements
- Enter to send chat message
- Escape to close video modal
- Arrow keys to navigate recordings grid

### ARIA Labels
```typescript
<button aria-label="Send message">
  <Send className="h-4 w-4" />
</button>

<div role="log" aria-live="polite" aria-label="Live chat messages">
  {messages.map(m => <ChatMessage key={m.id} {...m} />)}
</div>

<button aria-label={`Send ${reaction} reaction`}>
  {reaction}
</button>
```

### Screen Reader Announcements
```typescript
// Announce when stream goes live
<div role="status" aria-live="assertive" className="sr-only">
  {isLive && "Live stream has started"}
</div>

// Announce new chat messages
<div role="status" aria-live="polite" className="sr-only">
  {newMessageCount > 0 && `${newMessageCount} new messages`}
</div>
```

---

## Testing Strategy

### Unit Tests
- CountdownTimer calculations
- Time formatting functions
- Message filtering logic
- Provider URL validation

### Integration Tests
- Go Live flow (admin)
- Watch Live flow (member)
- Chat message sending
- Realtime subscriptions

### E2E Tests
- Admin goes live → Member sees stream
- Member sends chat → Other members see it
- Stream ends → Members see STATE 2
- Recording playback works

### Manual Testing
- Test all 4 streaming providers
- Test on mobile devices
- Test dark mode
- Test with slow network
- Test with 100+ chat messages

---

## Security Considerations

### RLS Policies
- All queries filtered by tenant_id
- Members can only INSERT their own messages
- Admins can UPDATE/DELETE any message in their tenant
- No cross-tenant data leakage

### Input Validation
- Sanitize chat messages (prevent XSS)
- Validate stream URLs before embedding
- Rate limit chat message sending
- Validate file uploads (thumbnails)

### Authentication
- Verify user is authenticated before showing chat
- Check member belongs to tenant before allowing chat
- Verify admin role before allowing Go Live

---

This design document provides the complete technical specification for implementing the Watch Live feature. All components, data flows, and UI patterns are defined and ready for implementation.
