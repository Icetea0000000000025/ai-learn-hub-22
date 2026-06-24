import { supabase } from "./supabase";

export async function checkPlagiarism(courseId: string) {
  const { data: currentCourse, error: courseError } = await supabase
    .from("courses")
    .select("id, title, description")
    .eq("id", courseId)
    .single();

  if (courseError) throw courseError;

  const { data: allCourses, error: allCoursesError } = await supabase
    .from("courses")
    .select("id, title, description")
    .neq("id", courseId);

  if (allCoursesError) throw allCoursesError;

  const matches = allCourses
    .map((otherCourse) => {
      // Check Title Similarity
      const titleSimilarity = calculateSimilarity(
        (currentCourse.title || "").toLowerCase().trim(),
        (otherCourse.title || "").toLowerCase().trim(),
      );

      // Check Description Similarity
      const descSimilarity = calculateSimilarity(
        (currentCourse.description || "").toLowerCase().trim(),
        (otherCourse.description || "").toLowerCase().trim(),
      );

      // Weighted similarity (Title is more suspicious if identical)
      const combinedSimilarity = titleSimilarity * 0.4 + descSimilarity * 0.6;

      return {
        courseId: otherCourse.id,
        title: otherCourse.title,
        similarity: combinedSimilarity,
        titleMatch: titleSimilarity > 0.8,
        descMatch: descSimilarity > 0.6,
      };
    })
    .filter((m) => m.similarity > 0.4 || m.titleMatch)
    .sort((a, b) => b.similarity - a.similarity);

  return matches;
}

function calculateSimilarity(s1: string, s2: string) {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  if (longer.length === 0) return 1.0;
  return (longer.length - editDistance(longer, shorter)) / longer.length;
}

function editDistance(s1: string, s2: string) {
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();
  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) costs[j] = j;
      else {
        if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1))
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}
