# AI Chatbot Feature

## Overview
This feature adds an AI assistant chatbot interface to all main report pages in the application. The chatbot opens as a sidebar from the right side of the screen and provides a conversational interface for users to interact with their data.

## Components

### 1. `AIButton` (`components/ai-button.tsx`)
- Purple button with Sparkles icon (no text, icon only)
- Positioned next to the "Export Report" button
- Opens the AI chatbot sidebar when clicked
- Accepts `currentPage` prop to provide context

### 2. `AIChatbotSidebar` (`components/ai-chatbot-sidebar.tsx`)
- Full-height sidebar that slides in from the right
- Features:
  - **Header**: Shows AI Assistant branding with Sparkles icon
  - **Context Management**: "Add Context" button to scope AI to current page
  - **Predefined Prompts**: 4 quick action buttons for common queries:
    - Analyze Trends 📊
    - Identify Issues ⚠️
    - Optimize Performance 🚀
    - Compare Periods 📈
  - **Chat Interface**: Message history with user/assistant distinction
  - **Input Area**: Textarea with send button (Enter to send, Shift+Enter for new line)
  - **Overlay**: Dark background overlay when sidebar is open

### 3. Current Implementation Status
- ✅ UI/UX complete and functional
- ✅ Context management (add/remove page context)
- ✅ Predefined prompts
- ✅ Message input and display
- ⚠️ **Placeholder responses only** - No actual AI functionality yet
- ⚠️ Backend integration pending

## Pages Updated
The AI button has been added to all pages with "Export Report" buttons:

### Packhouse Module
- ✅ Performance (`/packhouse/performance`)
- ✅ Breakdown (`/packhouse/breakdown`)
- ✅ Overview (`/packhouse/overview`)

### Distribution Module
- ✅ Overview (`/distribution/overview`)
- ✅ Breakdown (`/distribution/breakdown`)

### Production Module
- ✅ Overview (`/production/overview`)
- ✅ Breakdown (`/production/breakdown`)

### Harvest Module
- ✅ Overview (`/harvest/overview`)
- ✅ Breakdown (`/harvest/breakdown`)

### Business Gauge Module
- ✅ Overview (`/business-gauge/overview`)
- ✅ Detailed (`/business-gauge/detailed`)

### Price Wise Module
- ✅ Overview (`/price-wise/overview`)
- ✅ Breakdown (`/price-wise/breakdown`)

### Organisation Module
- ✅ Overview (`/organisation/overview`)
- ✅ Breakdown (`/organisation/breakdown`)

## Usage

### Adding to New Pages
To add the AI button to a new page:

```tsx
import { AIButton } from "@/components/ai-button"

// In your page component, add next to Export Report button:
<div className="flex items-center gap-2">
  <AIButton currentPage="Module Name - Page Name" />
  <Button className="bg-sidebar text-sidebar-foreground hover:bg-sidebar-accent">
    <Download className="size-4" />
    <span className="sr-only md:not-sr-only">Export Report</span>
  </Button>
</div>
```

## Styling
- **Purple Theme**: `bg-purple-600`, `hover:bg-purple-700`
- **Icon**: Lucide React `Sparkles` icon
- **Responsive**: Full width on mobile, 400-500px on desktop
- **Animation**: Smooth slide-in/out transition (300ms)

## Future Enhancements
1. **AI Integration**: Connect to OpenAI/Anthropic/custom LLM
2. **Context Awareness**: Actually use page data in AI responses
3. **Conversation History**: Persist chat history
4. **Data Analysis**: Allow AI to query and analyze actual data
5. **Export Chat**: Allow users to export conversation
6. **Voice Input**: Add speech-to-text capability
7. **Suggested Prompts**: Dynamic prompts based on current data
8. **Multi-language Support**: Internationalization

## Technical Notes
- Uses React hooks for state management
- Portal-based rendering for overlay
- Keyboard shortcuts supported (Enter/Shift+Enter)
- Accessible with screen reader support
- No external dependencies beyond existing UI components
