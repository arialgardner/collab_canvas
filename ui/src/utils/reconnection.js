export const backoffScheduleMs = [1000, 2000, 4000, 8000, 16000, 32000]

export const getBackoffDelay = (attempt) => {
  if (attempt < backoffScheduleMs.length) return backoffScheduleMs[attempt]
  return backoffScheduleMs[backoffScheduleMs.length - 1]
}


