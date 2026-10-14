"use client";

import { TopicRow } from "./TopicRow";
import { BTN_ADD, LIST_CARD } from "../ui/classes";
import { useStudyNote } from "@/lib/store";

export function InterviewAside() {
  const s = useStudyNote();

  return (
    <div>
      <div className="mb-8 flex items-center gap-8">
        <span className="text-12 font-semibold text-muted">주제 {s.topics.length}개</span>
        <button type="button" onClick={s.addTopic} className={BTN_ADD}>
          + 추가
        </button>
      </div>
      <div className={LIST_CARD}>
        {s.topics.map((t) => (
          <div key={t.id} className="border-t border-divider">
            <TopicRow topic={t} picked={t.id === s.topicId} />
          </div>
        ))}
      </div>
    </div>
  );
}
