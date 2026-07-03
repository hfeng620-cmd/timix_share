"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Gift, Loader2, Plus, Trash2, UploadCloud } from "lucide-react";

import { createCampaignWithBulkCodes } from "@/lib/drop-storage";
import { useForumAuth } from "@/lib/forum-auth";

const emptyForm = {
  title: "",
  sponsorName: "",
  sponsorUrl: "",
  description: "",
};

type SurveyQuestionDraft = {
  id: string;
  type: "choice" | "text";
  question: string;
  options: string;
};

type SurveyQuestionPayload = {
  question: string;
  type: "choice" | "text";
  options: string[];
};

function createEmptySurveyQuestion(): SurveyQuestionDraft {
  return {
    id: crypto.randomUUID(),
    type: "choice",
    question: "",
    options: "",
  };
}

function parseCodes(text: string) {
  return text
    .split(/[;\n]+/)
    .map((code) => code.trim())
    .filter((code) => code.length > 0);
}

function parseSurveyOptions(options: string) {
  return options
    .split(/[,，]+/)
    .map((option) => option.trim())
    .filter(Boolean);
}

export function AdminDropManager() {
  const { isAdmin } = useForumAuth();
  const [form, setForm] = useState(emptyForm);
  const [surveyQuestions, setSurveyQuestions] = useState<SurveyQuestionDraft[]>(() => [
    createEmptySurveyQuestion(),
  ]);
  const [bulkCodesText, setBulkCodesText] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const codeList = useMemo(() => parseCodes(bulkCodesText), [bulkCodesText]);

  if (!isAdmin) {
    return null;
  }

  function resetForm() {
    setForm(emptyForm);
    setSurveyQuestions([createEmptySurveyQuestion()]);
    setBulkCodesText("");
  }

  function addQuestion() {
    setSurveyQuestions((next) => [...next, createEmptySurveyQuestion()]);
  }

  function removeQuestion(idToRemove: string) {
    setSurveyQuestions((next) => (
      next.length > 1 ? next.filter((question) => question.id !== idToRemove) : next
    ));
  }

  function updateQuestion(id: string, field: "type" | "question" | "options", value: string) {
    setSurveyQuestions((next) => next.map((question) => (
      question.id === id ? { ...question, [field]: value } : question
    )));
  }

  async function handlePublish() {
    setStatus(null);
    const nextCodeList = parseCodes(bulkCodesText);

    if (nextCodeList.length === 0) {
      setStatus({ type: "error", message: "请至少输入一个兑换码。" });
      return;
    }

    const invalidQuestion = surveyQuestions.find((question) => {
      const hasQuestion = question.question.trim().length > 0;
      const hasOptions = parseSurveyOptions(question.options).length > 0;
      if (!hasQuestion && !hasOptions) return false;
      if (!hasQuestion) return true;
      return question.type === "choice" && !hasOptions;
    });

    if (invalidQuestion) {
      setStatus({ type: "error", message: "单选题需要填写题目和选项；自由填写题只需要填写题目。" });
      return;
    }

    const validQuestions: SurveyQuestionPayload[] = surveyQuestions
      .map((question) => ({
        question: question.question.trim(),
        type: question.type,
        options: question.type === "choice" ? parseSurveyOptions(question.options) : [],
      }))
      .filter((question) => question.question && (question.type === "text" || question.options.length > 0));

    const surveyConfig = validQuestions.length > 0 ? JSON.stringify(validQuestions) : "";
    const firstQuestion = validQuestions[0];

    setIsSubmitting(true);
    const result = await createCampaignWithBulkCodes({
      ...form,
      customQuestion: surveyConfig,
      customOptions: firstQuestion ? firstQuestion.options.join(", ") : "",
      codeList: nextCodeList,
    });
    setIsSubmitting(false);

    if (!result.ok) {
      setStatus({ type: "error", message: result.error });
      return;
    }

    setStatus({ type: "success", message: `成功发布活动，共存入 ${nextCodeList.length} 个兑换码！` });
    resetForm();
  }

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/40 p-6 shadow-2xl">
        <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-emerald-300">Admin Drop Console</p>
            <h2 className="mt-2 flex items-center gap-2 text-lg font-bold text-emerald-400">
              <Gift className="h-5 w-5" />
              新建福利活动 (Drop)
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              批量粘贴赞助商兑换码，一次性创建活动并写入库存表。
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3">
            <p className="text-xs text-emerald-200/70">已识别兑换码</p>
            <p className="mt-1 font-mono text-2xl font-bold text-emerald-200">{codeList.length}</p>
          </div>
        </div>

        {status ? (
          <div
            className={`mt-5 flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm ${
              status.type === "success"
                ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                : "border-red-400/20 bg-red-400/10 text-red-100"
            }`}
          >
            {status.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <Gift className="h-4 w-4" />}
            {status.message}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm text-zinc-300">
            <span>活动标题</span>
            <input
              value={form.title}
              onChange={(event) => setForm((next) => ({ ...next, title: event.target.value }))}
              className="w-full rounded-2xl border border-white/10 bg-zinc-950/70 px-4 py-3 text-white outline-none transition focus:border-emerald-300/60"
              placeholder="DeepSeek API 福利活动"
            />
          </label>
          <label className="space-y-2 text-sm text-zinc-300">
            <span>赞助商名称</span>
            <input
              value={form.sponsorName}
              onChange={(event) => setForm((next) => ({ ...next, sponsorName: event.target.value }))}
              className="w-full rounded-2xl border border-white/10 bg-zinc-950/70 px-4 py-3 text-white outline-none transition focus:border-emerald-300/60"
              placeholder="Timix 观察站"
            />
          </label>
          <label className="space-y-2 text-sm text-zinc-300 md:col-span-2">
            <span>注册链接</span>
            <input
              value={form.sponsorUrl}
              onChange={(event) => setForm((next) => ({ ...next, sponsorUrl: event.target.value }))}
              className="w-full rounded-2xl border border-white/10 bg-zinc-950/70 px-4 py-3 text-white outline-none transition focus:border-emerald-300/60"
              placeholder="https://timix.top"
            />
          </label>
          <label className="space-y-2 text-sm text-zinc-300 md:col-span-2">
            <span>活动说明</span>
            <textarea
              value={form.description}
              onChange={(event) => setForm((next) => ({ ...next, description: event.target.value }))}
              rows={4}
              className="w-full resize-none rounded-2xl border border-white/10 bg-zinc-950/70 px-4 py-3 text-white outline-none transition focus:border-emerald-300/60"
              placeholder="限量发放，先到先得..."
            />
          </label>
          <div className="md:col-span-2 rounded-2xl border border-emerald-300/10 bg-emerald-300/[0.03] p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-emerald-200">附加互动问卷 (可选)</p>
                <p className="mt-1 text-xs text-zinc-500">
                  不填时使用默认评价；填写后用户需回答这里的所有问题才能领码。
                </p>
              </div>
              <button
                type="button"
                onClick={addQuestion}
                className="inline-flex items-center justify-center gap-1 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-xs font-semibold text-emerald-200 transition hover:border-emerald-300/40 hover:bg-emerald-300/15"
              >
                <Plus className="h-4 w-4" />
                添加问题
              </button>
            </div>
            <div className="mt-4 space-y-4">
              {surveyQuestions.map((surveyQuestion, index) => (
                <div
                  key={surveyQuestion.id}
                  className="flex gap-3 rounded-2xl border border-white/5 bg-zinc-950/50 p-4"
                >
                  <div className="min-w-0 flex-1 space-y-4">
                    <div className="space-y-2 text-sm text-zinc-300">
                      <span>题型</span>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { value: "choice", label: "单选题" },
                          { value: "text", label: "自由填写题" },
                        ].map((typeOption) => (
                          <button
                            key={typeOption.value}
                            type="button"
                            onClick={() => updateQuestion(surveyQuestion.id, "type", typeOption.value)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                              surveyQuestion.type === typeOption.value
                                ? "border-emerald-300/50 bg-emerald-300/15 text-emerald-100"
                                : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                            }`}
                          >
                            {typeOption.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <label className="space-y-2 text-sm text-zinc-300">
                      <span>问题 {index + 1}</span>
                      <input
                        value={surveyQuestion.question}
                        onChange={(event) => updateQuestion(surveyQuestion.id, "question", event.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-zinc-950/70 px-4 py-3 text-white outline-none transition focus:border-emerald-300/60"
                        placeholder="例如：你觉得 TiMix 这次福利活动怎么样？"
                      />
                    </label>
                    {surveyQuestion.type === "choice" ? (
                      <label className="space-y-2 text-sm text-zinc-300">
                        <span>选项 (用逗号分隔，中文/英文逗号都可以)</span>
                        <input
                          value={surveyQuestion.options}
                          onChange={(event) => updateQuestion(surveyQuestion.id, "options", event.target.value)}
                          className="w-full rounded-2xl border border-white/10 bg-zinc-950/70 px-4 py-3 text-white outline-none transition focus:border-emerald-300/60"
                          placeholder="例如：🔥 夯爆了, 🤖 还不错, 💩 需要改进"
                        />
                      </label>
                    ) : (
                      <p className="rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.04] px-4 py-3 text-xs leading-5 text-cyan-100/70">
                        自由填写题会在领取弹窗里显示为必填文本框，不需要配置选项。
                      </p>
                    )}
                  </div>
                  {surveyQuestions.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeQuestion(surveyQuestion.id)}
                      className="mt-8 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-500 transition hover:border-red-300/30 hover:bg-red-400/10 hover:text-red-300"
                      aria-label={`删除问题 ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
          <label className="space-y-2 text-sm text-zinc-300 md:col-span-2">
            <span>批量导入真实兑换码 (支持分号 ; 或 回车换行分隔)</span>
            <textarea
              value={bulkCodesText}
              onChange={(event) => setBulkCodesText(event.target.value)}
              rows={10}
              className="w-full resize-y rounded-2xl border border-white/10 bg-black/40 px-4 py-3 font-mono text-sm text-emerald-50 outline-none transition placeholder:text-zinc-600 focus:border-emerald-300/60"
              placeholder={"XXXX-XXXX; YYYY-YYYY; ZZZZ-ZZZZ\n..."}
            />
          </label>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-zinc-400">
            已识别: <span className="font-mono font-bold text-emerald-300">{codeList.length}</span> 个兑换码
          </p>
          <button
            type="button"
            onClick={() => void handlePublish()}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-400 px-6 py-3 text-sm font-bold text-zinc-950 shadow-[0_0_30px_rgba(52,211,153,0.22)] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            {isSubmitting ? "正在发布..." : "一键发布活动并入库"}
          </button>
        </div>
      </div>
    </section>
  );
}
