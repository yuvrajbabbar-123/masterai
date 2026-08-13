import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { LessonRunner, courseToSteps } from "@/components/LessonRunner";

export default function CourseView() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);

  useEffect(() => {
    api.get(`/courses/${courseId}`).then((r) => setCourse(r.data)).catch(() => navigate("/app/learn"));
  }, [courseId, navigate]);

  if (!course) return <div className="text-[#525252] font-mono-type animate-pulse">loading course…</div>;

  return (
    <LessonRunner
      title={course.title}
      subject={course.subject || course.topic}
      steps={courseToSteps(course)}
      backTo="/app/learn"
      backLabel="Courses"
      mode="learn"
    />
  );
}
