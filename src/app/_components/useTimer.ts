import { useState, useEffect, useCallback, useRef } from 'react'

export type TimerState = {
  duration: number
  remaining: number
  active: boolean
  expired: boolean
  handleChange: (value: number) => void
  reset: () => void
}

export function useTimer(): TimerState {
  const [timerDuration, setTimerDuration] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [timerActive, setTimerActive] = useState(false)
  const [timerExpired, setTimerExpired] = useState(false)
  const [timerKey, setTimerKey] = useState(0)
  const timerRef = useRef<number | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const reset = useCallback(() => {
    clearTimer()
    setTimerExpired(false)
    if (timerDuration > 0) {
      setTimeRemaining(timerDuration)
      setTimerActive(true)
      setTimerKey((k) => k + 1)
    } else {
      setTimeRemaining(0)
      setTimerActive(false)
    }
  }, [timerDuration, clearTimer])

  // Countdown effect — re-runs whenever timerKey changes
  useEffect(() => {
    if (!timerActive || timeRemaining <= 0) return
    timerRef.current = window.setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearTimer()
          setTimerActive(false)
          setTimerExpired(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return clearTimer
  }, [timerActive, timerKey, clearTimer])

  // Stop timer when duration is set to 0
  useEffect(() => {
    if (timerDuration === 0) {
      clearTimer()
      setTimerActive(false)
      setTimeRemaining(0)
      setTimerExpired(false)
    }
  }, [timerDuration, clearTimer])

  const handleChange = useCallback((value: number) => {
    clearTimer()
    setTimerDuration(value)
    setTimerExpired(false)
    if (value > 0) {
      setTimeRemaining(value)
      setTimerActive(false)
    } else {
      setTimeRemaining(0)
      setTimerActive(false)
    }
  }, [clearTimer])

  return {
    duration: timerDuration,
    remaining: timeRemaining,
    active: timerActive,
    expired: timerExpired,
    handleChange,
    reset,
  }
}