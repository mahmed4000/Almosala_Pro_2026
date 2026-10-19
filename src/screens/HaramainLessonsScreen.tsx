import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, Modal, ActivityIndicator, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { createAudioPlayer } from 'expo-audio';
import { useApp } from '../context/AppContext';
import { Header } from '../components/common/Header';
import { TextUI } from '../components/common/TextUI';
import {
  PROPHET_MOSQUE_SCHEDULE,
  PROPHET_MOSQUE_COURSES,
  MAKKAH_MOSQUE_SCHEDULE,
  MAKKAH_MOSQUE_COURSES
} from '../data/haramainData';
import { AudioService, DownloadedLessonRecord } from '../services/audioService';
import { toArabicNumber } from '../services/prayerCalculation';
import { TOKENS, makeShadow } from '../constants/tokens';

export const HaramainLessonsScreen: React.FC = () => {
  const { goBack, theme, themeMode, t, triggerHaptic } = useApp();
  const c = theme;

  const [activeMosqueTab, setActiveMosqueTab] = useState<'madinah' | 'makkah'>('madinah');
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [currentSecs, setCurrentSecs] = useState<number>(0);
  const [totalSecs, setTotalSecs] = useState<number>(0);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [downloadedMap, setDownloadedMap] = useState<Record<string, DownloadedLessonRecord>>({});

  const nativePlayerRef = useRef<any>(null);
  const webAudioRef = useRef<any>(null);

  const courses = activeMosqueTab === 'madinah' ? PROPHET_MOSQUE_COURSES : MAKKAH_MOSQUE_COURSES;
  const schedules = activeMosqueTab === 'madinah' ? PROPHET_MOSQUE_SCHEDULE : MAKKAH_MOSQUE_SCHEDULE;

  // Load downloaded state
  useEffect(() => {
    (async () => {
      const records = await AudioService.getDownloadedLessons();
      setDownloadedMap(records);
    })();
  }, []);

  const stopAllAudio = () => {
    try {
      if (nativePlayerRef.current) {
        nativePlayerRef.current.pause();
        nativePlayerRef.current.remove();
        nativePlayerRef.current = null;
      }
      if (webAudioRef.current) {
        webAudioRef.current.pause();
        webAudioRef.current = null;
      }
      setIsPlaying(false);
    } catch (e) {}
  };

  const playLesson = async (course: any, lesson: any) => {
    triggerHaptic('light');
    stopAllAudio();
    setActiveLesson(lesson);
    setSelectedCourse(course);

    const isDownloaded = downloadedMap[lesson.id];
    const url = isDownloaded?.localUri || lesson.audioUrl || course.audioStreamUrl;

    try {
      const player = createAudioPlayer(url, { updateInterval: 500 });
      if (player) {
        nativePlayerRef.current = player;
        player.addListener('playbackStatusUpdate', (status: any) => {
          if (status) {
            const cur = Math.floor(status.currentTime || 0);
            const tot = Math.floor(status.duration || 0);
            setCurrentSecs(cur);
            setTotalSecs(tot);
            if (status.didJustFinish) {
              setIsPlaying(false);
            }
          }
        });
        player.play();
        setIsPlaying(true);
        return;
      }
    } catch (e) {}

    // HTML5 fallback for web
    if (typeof window !== 'undefined' && typeof Audio !== 'undefined') {
      const sound = new Audio(url);
      webAudioRef.current = sound;
      sound.ontimeupdate = () => {
        setCurrentSecs(Math.floor(sound.currentTime));
        setTotalSecs(Math.floor(sound.duration || 0));
      };
      sound.onended = () => setIsPlaying(false);
      sound.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const togglePlayPause = () => {
    triggerHaptic('light');
    if (isPlaying) {
      nativePlayerRef.current?.pause();
      webAudioRef.current?.pause();
      setIsPlaying(false);
    } else {
      nativePlayerRef.current?.play();
      webAudioRef.current?.play();
      setIsPlaying(true);
    }
  };

  const skipSeconds = (delta: number) => {
    triggerHaptic('light');
    const next = Math.max(0, currentSecs + delta);
    if (nativePlayerRef.current) {
      if (typeof nativePlayerRef.current.seekTo === 'function') {
        nativePlayerRef.current.seekTo(next);
      } else {
        nativePlayerRef.current.currentTime = next;
      }
    }
    if (webAudioRef.current) {
      webAudioRef.current.currentTime = next;
    }
    setCurrentSecs(next);
  };

  const handleDownload = async (course: any, lesson: any) => {
    triggerHaptic('medium');
    setDownloadProgress((prev) => ({ ...prev, [lesson.id]: 10 }));
    const result = await AudioService.downloadLesson(course, lesson, (pct) => {
      setDownloadProgress((prev) => ({ ...prev, [lesson.id]: pct }));
    });
    if (result) {
      setDownloadedMap((prev) => ({ ...prev, [lesson.id]: result }));
    }
    setDownloadProgress((prev) => {
      const next = { ...prev };
      delete next[lesson.id];
      return next;
    });
  };

  const formatSecs = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${toArabicNumber(m)}:${toArabicNumber(sec)}`;
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header
        title={t('دروس وكراسي الحرمين الشريفين', 'Haramain Scholars Chairs')}
        subtitle={t('المسجد الحرام بمكة • المسجد النبوي بالمدينة', 'Makkah & Madinah Scholars')}
        onBack={goBack}
      />

      {/* Mosque Tabs (Madinah / Makkah) */}
      <View
        style={{
          flexDirection: 'row',
          marginHorizontal: 18,
          marginTop: 12,
          marginBottom: 16,
          backgroundColor: c.surface,
          borderRadius: TOKENS.radius.pill,
          padding: 4,
          borderWidth: 1,
          borderColor: c.border
        }}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            triggerHaptic('light');
            setActiveMosqueTab('madinah');
          }}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: TOKENS.radius.pill,
            alignItems: 'center',
            backgroundColor: activeMosqueTab === 'madinah' ? TOKENS.colors.primary : 'transparent'
          }}
        >
          <TextUI
            size={14}
            weight="bold"
            color={activeMosqueTab === 'madinah' ? '#FFFFFF' : c.textPrimary}
          >
            🕌 المسجد النبوي الشريف
          </TextUI>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            triggerHaptic('light');
            setActiveMosqueTab('makkah');
          }}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: TOKENS.radius.pill,
            alignItems: 'center',
            backgroundColor: activeMosqueTab === 'makkah' ? TOKENS.colors.primary : 'transparent'
          }}
        >
          <TextUI
            size={14}
            weight="bold"
            color={activeMosqueTab === 'makkah' ? '#FFFFFF' : c.textPrimary}
          >
            🕋 المسجد الحرام بمكة
          </TextUI>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Schedule & Chairs Banner */}
        <TextUI size={16} weight="bold" color={c.textPrimary} style={{ marginBottom: 12 }}>
          {t('السلاسل والدروس التأصيلية المتاحة', 'Available Scientific Courses')}
        </TextUI>

        {courses.map((course: any) => (
          <View
            key={course.id}
            style={{
              backgroundColor: c.surface,
              borderRadius: 18,
              padding: 18,
              marginBottom: 14,
              borderWidth: 1,
              borderColor: c.border,
              ...makeShadow('0 2px 8px rgba(0,0,0,0.03)', '#000', 0.03, 3)
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <View style={{ flex: 1 }}>
                <TextUI size={16} weight="bold" color={TOKENS.colors.primaryDark}>
                  {course.titleAr}
                </TextUI>
                <TextUI size={13} weight="medium" color={TOKENS.colors.primary} style={{ marginTop: 2 }}>
                  {course.scholarAr}
                </TextUI>
              </View>

              <View
                style={{
                  backgroundColor: themeMode === 'light' ? TOKENS.colors.secondaryLight : '#382E28',
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: TOKENS.radius.pill
                }}
              >
                <TextUI size={11} weight="bold" color={TOKENS.colors.primaryDark}>
                  {course.categoryAr}
                </TextUI>
              </View>
            </View>

            <TextUI size={12} color={c.textSecondary} style={{ lineHeight: 18, marginBottom: 12 }}>
              {course.descriptionAr}
            </TextUI>

            {/* Lessons List in Course */}
            <View style={{ gap: 8 }}>
              {course.lessons.slice(0, 4).map((lesson: any) => {
                const isCurrent = activeLesson?.id === lesson.id;
                const isDownloaded = !!downloadedMap[lesson.id];
                const isDownloading = downloadProgress[lesson.id] != null;

                return (
                  <View
                    key={lesson.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: isCurrent ? (themeMode === 'light' ? TOKENS.colors.primaryLight : '#382A20') : c.bgSecondary,
                      borderRadius: 12,
                      padding: 10
                    }}
                  >
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => playLesson(course, lesson)}
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                    >
                      <Feather
                        name={isCurrent && isPlaying ? 'pause-circle' : 'play-circle'}
                        size={22}
                        color={TOKENS.colors.primary}
                      />
                      <View style={{ flex: 1 }}>
                        <TextUI size={13} weight={isCurrent ? 'bold' : 'medium'} color={c.textPrimary} numberOfLines={1}>
                          {lesson.number}. {lesson.titleAr}
                        </TextUI>
                        <TextUI size={11} color={c.textSecondary}>
                          {lesson.duration}
                        </TextUI>
                      </View>
                    </TouchableOpacity>

                    {/* Download Button */}
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => handleDownload(course, lesson)}
                      disabled={isDownloaded || isDownloading}
                      style={{ padding: 6 }}
                    >
                      {isDownloading ? (
                        <ActivityIndicator size="small" color={TOKENS.colors.primary} />
                      ) : (
                        <Feather
                          name={isDownloaded ? 'check-circle' : 'download-cloud'}
                          size={18}
                          color={isDownloaded ? '#4CAF50' : c.textSecondary}
                        />
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Floating Audio Player Bar */}
      {activeLesson && (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: c.surfaceElevated,
            borderTopWidth: 1,
            borderColor: c.border,
            paddingHorizontal: 18,
            paddingVertical: 12,
            ...makeShadow('0 -4px 16px rgba(0,0,0,0.08)', '#000', 0.08, 6)
          }}
        >
          {/* Progress Slider Bar */}
          <View style={{ height: 3, width: '100%', backgroundColor: c.border, marginBottom: 10 }}>
            <View
              style={{
                height: '100%',
                width: totalSecs > 0 ? `${(currentSecs / totalSecs) * 100}%` : '0%',
                backgroundColor: TOKENS.colors.primary
              }}
            />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <TextUI size={13} weight="bold" color={c.textPrimary} numberOfLines={1}>
                {activeLesson.titleAr}
              </TextUI>
              <TextUI size={11} color={c.textSecondary}>
                {formatSecs(currentSecs)} / {formatSecs(totalSecs)}
              </TextUI>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <TouchableOpacity onPress={() => skipSeconds(-15)}>
                <Feather name="rotate-ccw" size={18} color={c.textPrimary} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={togglePlayPause}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: TOKENS.colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Feather name={isPlaying ? 'pause' : 'play'} size={18} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => skipSeconds(15)}>
                <Feather name="rotate-cw" size={18} color={c.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};
