# Intern Chat Application 🚀

A modern, real-time communication platform designed for seamless interaction between Admins and Interns. Built with React, Supabase, and tailored for a premium user experience on both desktop and mobile devices.

## ✨ Key Features

### 🎨 UI/UX & Design
-   **Responses & Fluid**: Fully responsive design that adapts perfectly from large desktop monitors to mobile phones.
-   **Dark & Light Mode**: Built-in theme toggle with persistence (remembers your preference).
    -   *Dark Mode*: Deep slate/blue tones for reduced eye strain `[#0f172a]`.
    -   *Light Mode*: Crisp white/slate theme with high-contrast text `[#000000]`.
-   **Glassmorphism**: Subtle blur effects and transparencies in headers and sidebars.
-   **Animations**: Smooth transitions for sidebars, modals, and messages.

### 📱 Mobile Experience
-   **Mobile-First Controls**: Custom hamburger menu and full-screen toggle for an app-like feel on phones.
-   **Adaptive Layout**: Sidebar behaves as a slide-out drawer on smaller screens.
-   **Touch-Optimized**: Larger touch targets for buttons and interactive elements.

### 💬 Chat Functionality
-   **Real-Time Messaging**: Instant delivery using Supabase Realtime subscriptions.
-   **Rich Media Sharing**:
    -   Secure image uploads with **Signed URLs** (valid for 10 years).
    -   Image preview card styling.
    -   Full-screen image viewer modal.
-   **Emoji Support**: Integrated emoji picker.
-   **Message Status**: Visual distinctions for sent vs. received messages.

### 🛡️ Admin Portal
-   **Dashboard Overview**: View all registered interns and their status.
-   **User Management**:
    -   **Delete User**: Cascade deletion removes all messages associated with a user before removing their profile to ensure database integrity.
    -   **Clear Chat**: Option to wipe conversation history.
-   **Privacy**: Admin chat headers clearly identify the active user being messaged.



## 🛠️ Tech Stack

-   **Frontend**: React (Vite)
-   **Backend / DB**: Supabase (PostgreSQL, Auth, Storage, Realtime)
-   **Styling**: Custom CSS (PostCSS), Tailwind Utility Classes (for layout structure), Lucide React (Icons)
-   **State Management**: React Hooks (`useState`, `useEffect`, `useRef`)

## 🚀 Getting Started

1.  **Clone the repository**
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Environment Setup**:
    Create a `.env` file with your Supabase credentials:
    ```env
    VITE_SUPABASE_URL=your_project_url
    VITE_SUPABASE_ANON_KEY=your_anon_key
    ```
4.  **Run the dev server**:
    ```bash
    npm run dev
    ```

## 🔒 Security

-   **Row Level Security (RLS)**: Database policies ensure interns can only see their own messages.
-   **Secure Storage**: Files are stored in private buckets and accessed only via signed URLs.

---
*Developed by Nikunj Kumar*
