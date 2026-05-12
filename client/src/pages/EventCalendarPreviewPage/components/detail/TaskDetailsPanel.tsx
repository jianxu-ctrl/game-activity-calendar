import { stripRichText, text, getField } from "../../utils";
import { CollapsibleDetailSection } from "../common/CollapsibleDetailSection";

export function TaskDetailsPanel({ eventTasks, taskDetails, t, uiText }: any) {
  if (!eventTasks || !eventTasks.length) return null;

  const taskTypeRows = eventTasks.map((row: any, index: number) => {
    const taskType = text(getField(row, ["TaskType", "任务类型", "Type"]));
    const detailGroup = (taskDetails || []).find((group: any) => text(group.taskType) === taskType);
    return {
      index,
      taskType: taskType || "N/A",
      tasks: detailGroup ? detailGroup.tasks || [] : [],
      debug: detailGroup ? detailGroup.debug || "" : "",
    };
  });

  const totalTasks = taskTypeRows.reduce((sum: number, group: any) => sum + group.tasks.length, 0);

  return (
    <CollapsibleDetailSection type="task" title="EventTask" countLabel={`${totalTasks} Tasks`}>
      <div className="space-y-3">
        {taskTypeRows.map((group: { index: number; taskType: string; tasks: any[]; debug: string }) => (
          <div key={`${group.taskType}-${group.index}`} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-800">TaskType: {group.taskType}</div>
              <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-600 ring-1 ring-slate-200">{group.tasks.length} Tasks</span>
            </div>
            {group.tasks.length > 0 ? (
              <div className="overflow-auto rounded-xl border bg-white">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="w-16 whitespace-nowrap p-2 text-left">TaskNum</th>
                      <th className="min-w-48 p-2 text-left">Task</th>
                      <th className="min-w-40 p-2 text-left">Reward</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.tasks.map((task: any, index: number) => {
                      const title = stripRichText(t(task.titleKey) || task.titleKey || `Task ${index + 1}`);
                      const desc = task.descKey ? stripRichText(t(task.descKey)) : "";
                      return (
                        <tr key={`${group.taskType}-${task.taskId || index}`} className="border-t align-top">
                          <td className="p-2 text-slate-700">{index + 1}</td>
                          <td className="p-2">
                            <div className="font-medium text-slate-900">{title}</div>
                            {desc && desc !== title && <div className="mt-1 text-slate-500">{desc}</div>}
                          </td>
                          <td className="p-2">
                            {task.rewards && task.rewards.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {task.rewards.map((reward: any, rewardIndex: number) => (
                                  <span key={`${reward.itemId}-${rewardIndex}`} className="rounded-full bg-white px-2 py-1 text-slate-700 ring-1 ring-slate-200">
                                    {stripRichText(t(reward.itemNameKey))} * {reward.count}
                                  </span>
                                ))}
                              </div>
                            ) : <span className="text-slate-400">{uiText.noMatchedReward}</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-700">No Mission Task rows matched TaskType = {group.taskType}. {group.debug}</div>}
          </div>
        ))}
      </div>
    </CollapsibleDetailSection>
  );
}
