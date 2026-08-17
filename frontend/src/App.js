import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import InstallPrompt from "@/components/InstallPrompt";
import { Keyboard } from "@phosphor-icons/react";

import Login from "@/pages/Login";
import AuthCallback from "@/pages/AuthCallback";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import TypingPractice from "@/pages/TypingPractice";
import LearnScratch from "@/pages/LearnScratch";
import CourseView from "@/pages/CourseView";
import LearnDocuments from "@/pages/LearnDocuments";
import DocumentView from "@/pages/DocumentView";
import AskAI from "@/pages/AskAI";
import TestYourself from "@/pages/TestYourself";
import WordOfDay from "@/pages/WordOfDay";
import Profile from "@/pages/Profile";
import Leaderboard from "@/pages/Leaderboard";
import Subscription from "@/pages/Subscription";

function Loader() {
  return (
    <div className="min-h-screen flex items-center justify-center relative z-10">
      <div className="w-12 h-12 rounded-xl bg-[#EAB308] flex items-center justify-center animate-pulse">
        <Keyboard weight="fill" className="text-[#0A0A0A]" size={28} />
      </div>
    </div>
  );
}

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRouter() {
  const location = useLocation();
  // Handle Emergent OAuth callback FIRST (synchronous during render)
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/app/typing" replace />} />
      <Route path="/app" element={<Protected><Layout /></Protected>}>
        <Route index element={<Dashboard />} />
        <Route path="typing" element={<TypingPractice />} />
        <Route path="learn" element={<LearnScratch />} />
        <Route path="learn/:courseId" element={<CourseView />} />
        <Route path="documents" element={<LearnDocuments />} />
        <Route path="documents/:documentId" element={<DocumentView />} />
        <Route path="ask" element={<AskAI />} />
        <Route path="test" element={<TestYourself />} />
        <Route path="word" element={<WordOfDay />} />
        <Route path="profile" element={<Profile />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="subscription" element={<Subscription />} />
      </Route>
      <Route path="*" element={<Navigate to="/app/typing" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRouter />
        <Toaster position="top-center" theme="dark" />
        <InstallPrompt />
      </BrowserRouter>
    </AuthProvider>
  );
}
