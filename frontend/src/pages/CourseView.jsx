import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";
import { LessonRunner, courseToSteps } from "@/components/LessonRunner";

export default function CourseView() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    api.get(`/courses/${courseId}`).then((r) => setCourse(r.data)).catch(() => navigate("/app/learn"));
  }, [courseId, navigate]);

  if (!course) return <div className="text-[#525252] font-mono-type animate-pulse">loading course…</div>;

  const learnMore = async () => {
    const known = (course.modules || []).flatMap((m) => (m.lessons || []).map((l) => l.concept)).filter(Boolean);
    setLoadingMore(true);
    try {
      const res = await api.post("/ai/course", { topic: course.topic || course.title, known_concepts: known });
      toast.success("Next level ready — keep going!");
      navigate(`/app/learn/${res.data.course_id}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not build the next course");
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <LessonRunner
      key={course.course_id}
      title={course.title}
      subject={course.subject || course.topic}
      steps={courseToSteps(course)}
      backTo="/app/learn"
      backLabel="Courses"
      mode="learn"
      onLearnMore={learnMore}
      learnMoreLoading={loadingMore}
    />
  );
}
