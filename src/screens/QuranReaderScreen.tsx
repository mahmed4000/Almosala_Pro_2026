import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  Share,
  TextInput,
  ActivityIndicator,
  Platform
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { createAudioPlayer } from 'expo-audio';
import { useApp } from '../context/AppContext';
import { Header } from '../components/common/Header';
import { TextUI } from '../components/common/TextUI';
import { toArabicNumber } from '../services/prayerCalculation';
import {
  parseSurahVerses,
  QuranVerse,
  QURAN_RECITERS,
  getAyahAudioUrl
} from '../services/quranParser';
import { TOKENS, makeShadow } from '../constants/tokens';

const QURAN_DATA: any[] = require('../../assets/quran_complete_114.json');

export const QuranReaderScreen: React.FC = () => {
  const {
    goBack,
    theme,
    themeMode,
    t,
    selectedSurah,
    setSelectedSurah,
    quranFontSize,
    setQuranFontSize,
    readingBookmark,
    setReadingBookmark,
    triggerHaptic
  } = useApp();

  const c = theme;
  const currentSurah = selectedSurah || QURAN_DATA[0];
  const parsedSurah = parseSurahVerses(currentSurah);

  const [activeAyah, setActiveAyah] = useState<QuranVerse | null>(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [selectedReciter, setSelectedReciter] = useState(QURAN_RECITERS[0].id);
  const [reciterModalVisible, setReciterModalVisible] = useState(false);
  const [playingAyahNum, setPlayingAyahNum] = useState<number | null>(null);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [searchWord, setSearchWord] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const audioPlayerRef = useRef<any>(null);
  const webAudioRef = useRef<any>(null);

  const isBookmarked = readingBookmark?.surahId === currentSurah.id;

  // Clean audio on unmount
  useEffect(() => {
    return () => {
      try {
        if (audioPlayerRef.current) {
          audioPlayerRef.current.pause();
          audioPlayerRef.current.remove();
        }
        if (webAudioRef.current) {
          webAudioRef.current.pause();
        }
      } catch (e) {}
    };
  }, []);

  const stopAudio = () => {
    try {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.remove();
        audioPlayerRef.current = null;
      }
      if (webAudioRef.current) {
        webAudioRef.current.pause();
        webAudioRef.current = null;
      }
      setPlayingAyahNum(null);
      setIsAudioLoading(false);
    } catch (e) {}
  };

  const playAyahAudio = async (verse: QuranVerse) => {
    triggerHaptic('light');
    stopAudio();
    setPlayingAyahNum(verse.ayahNumber);
    setIsAudioLoading(true);

    const url = getAyahAudioUrl(currentSurah.id, verse.ayahNumber, selectedReciter);

    try {
      const player = createAudioPlayer(url, { updateInterval: 250 });
      if (player) {
        audioPlayerRef.current = player;
        player.addListener('playbackStatusUpdate', (status: any) => {
          setIsAudioLoading(false);
          if (status?.didJustFinish) {
            // Auto play next ayah in surah
            const nextAyah = parsedSurah.verses.find((v) => v.ayahNumber === verse.ayahNumber + 1);
            if (nextAyah) {
              playAyahAudio(nextAyah);
            } else {
              setPlayingAyahNum(null);
            }
          }
        });
        player.play();
        return;
      }
    } catch (e) {}

    // Web fallback
    if (typeof window !== 'undefined' && typeof Audio !== 'undefined') {
      const sound = new Audio(url);
      webAudioRef.current = sound;
      sound.oncanplay = () => setIsAudioLoading(false);
      sound.onended = () => {
        const nextAyah = parsedSurah.verses.find((v) => v.ayahNumber === verse.ayahNumber + 1);
        if (nextAyah) {
          playAyahAudio(nextAyah);
        } else {
          setPlayingAyahNum(null);
        }
      };
      sound.play().catch(() => setPlayingAyahNum(null));
    }
  };

  const handleOpenAyahAction = (verse: QuranVerse) => {
    triggerHaptic('light');
    setActiveAyah(verse);
    setActionModalVisible(true);
  };

  const toggleReadingBookmark = (ayahNum = 1) => {
    triggerHaptic('success');
    if (isBookmarked && readingBookmark?.ayah === ayahNum) {
      setReadingBookmark(null);
    } else {
      setReadingBookmark({
        surahId: currentSurah.id,
        surahName: `سورة ${currentSurah.nameAr}`,
        ayah: ayahNum,
        page: currentSurah.mushafPageStart || 1,
        juz: currentSurah.juz || 1,
        date: 'الآن'
      });
    }
    setActionModalVisible(false);
  };

  const handleShareAyah = (verse: QuranVerse) => {
    triggerHaptic('light');
    Share.share({
      message: `﴿ ${verse.text} ﴾ [سورة ${currentSurah.nameAr}: ${verse.ayahNumber}]\n— تطبيق رفيق المسلم (Almosala Pro)`
    });
    setActionModalVisible(false);
  };

  const handleNextSurah = () => {
    stopAudio();
    triggerHaptic('light');
    const nextId = (currentSurah.id % 114) + 1;
    const next = QURAN_DATA.find((s) => s.id === nextId);
    if (next) setSelectedSurah(next);
  };

  const handlePrevSurah = () => {
    stopAudio();
    triggerHaptic('light');
    const prevId = currentSurah.id === 1 ? 114 : currentSurah.id - 1;
    const prev = QURAN_DATA.find((s) => s.id === prevId);
    if (prev) setSelectedSurah(prev);
  };

  const displayedVerses = parsedSurah.verses.filter((v) => {
    if (!searchWord.trim()) return true;
    return v.text.includes(searchWord.trim()) || v.ayahNumber.toString() === searchWord.trim();
  });

  const currentReciterObj = QURAN_RECITERS.find((r) => r.id === selectedReciter) || QURAN_RECITERS[0];

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header
        title={`سورة ${currentSurah.nameAr}`}
        subtitle={`${currentSurah.type} • ${toArabicNumber(currentSurah.verses)} آية • ص ${toArabicNumber(currentSurah.mushafPageStart || 1)}`}
        onBack={goBack}
        rightAction={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {/* Search In Surah Button */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setIsSearching(!isSearching)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: isSearching ? TOKENS.colors.primary : c.surface,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: c.border
              }}
            >
              <Feather name="search" size={14} color={isSearching ? '#FFFFFF' : c.textPrimary} />
            </TouchableOpacity>

            {/* Reciter Selector */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setReciterModalVisible(true)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: c.surface,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: c.border
              }}
            >
              <Feather name="mic" size={14} color={TOKENS.colors.primary} />
            </TouchableOpacity>

            {/* Font Adjuster A- */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                triggerHaptic('light');
                setQuranFontSize((prev: number) => Math.max(16, prev - 2));
              }}
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: c.surface,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: c.border
              }}
            >
              <TextUI size={11} weight="bold" color={c.textPrimary}>A-</TextUI>
            </TouchableOpacity>

            {/* Font Adjuster A+ */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                triggerHaptic('light');
                setQuranFontSize((prev: number) => Math.min(44, prev + 2));
              }}
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: c.surface,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: c.border
              }}
            >
              <TextUI size={13} weight="bold" color={c.textPrimary}>A+</TextUI>
            </TouchableOpacity>
          </View>
        }
      />

      {/* In-Surah Search Bar */}
      {isSearching && (
        <View style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: c.surface, borderBottomWidth: 1, borderColor: c.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Feather name="search" size={16} color={c.textSecondary} />
            <TextInput
              placeholder="ابحث عن كلمة أو رقم الآية في السورة..."
              placeholderTextColor={c.textSecondary}
              value={searchWord}
              onChangeText={setSearchWord}
              style={{ flex: 1, color: c.textPrimary, textAlign: 'right', fontSize: 13 }}
            />
            {searchWord ? (
              <TouchableOpacity onPress={() => setSearchWord('')}>
                <Feather name="x" size={16} color={c.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      )}

      {/* Reciter Playing Bar */}
      {playingAyahNum != null && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: TOKENS.colors.primaryDark,
            paddingHorizontal: 16,
            paddingVertical: 10
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {isAudioLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Feather name="volume-2" size={16} color={TOKENS.colors.secondary} />
            )}
            <TextUI size={12} weight="bold" color="#FFFFFF">
              تلاوة الآية {toArabicNumber(playingAyahNum)} • {currentReciterObj.nameAr}
            </TextUI>
          </View>

          <TouchableOpacity onPress={stopAudio} style={{ padding: 4 }}>
            <Feather name="stop-circle" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 18, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Surah Header Banner */}
        <View
          style={{
            alignItems: 'center',
            backgroundColor: themeMode === 'light' ? TOKENS.colors.secondaryLight : '#382E28',
            borderRadius: 18,
            paddingVertical: 14,
            paddingHorizontal: 20,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: TOKENS.colors.secondary
          }}
        >
          <TextUI quran size={24} weight="bold" color={TOKENS.colors.primaryDark}>
            سورة {currentSurah.nameAr}
          </TextUI>
          <TextUI size={12} color={TOKENS.colors.textSecondary} style={{ marginTop: 2 }}>
            {currentSurah.type} • {toArabicNumber(currentSurah.verses)} آية • الجزء {toArabicNumber(currentSurah.juz || 1)}
          </TextUI>
        </View>

        {/* Basmalah */}
        {currentSurah.id !== 9 && currentSurah.id !== 1 && (
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <TextUI quran size={22} weight="bold" color={TOKENS.colors.primaryDark}>
              بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
            </TextUI>
          </View>
        )}

        {/* Continuous Ayahs Stream with Clickable Ayah Spans */}
        <View
          style={{
            backgroundColor: c.surface,
            borderRadius: 20,
            padding: 20,
            borderWidth: 1,
            borderColor: c.border,
            marginBottom: 20,
            ...makeShadow('0 2px 10px rgba(0,0,0,0.02)', '#000', 0.02, 3)
          }}
        >
          <TextUI
            quran
            size={quranFontSize}
            color={c.textPrimary}
            style={{
              lineHeight: Math.round(quranFontSize * 2.1),
              textAlign: 'justify'
            }}
          >
            {displayedVerses.map((verse) => {
              const isPlaying = playingAyahNum === verse.ayahNumber;
              const isMarked = readingBookmark?.surahId === currentSurah.id && readingBookmark?.ayah === verse.ayahNumber;

              return (
                <TextUI
                  key={`v-${verse.ayahNumber}`}
                  onPress={() => handleOpenAyahAction(verse)}
                  style={{
                    backgroundColor: isPlaying
                      ? 'rgba(198, 146, 85, 0.35)'
                      : isMarked
                      ? 'rgba(212, 163, 115, 0.25)'
                      : undefined
                  }}
                >
                  {isMarked ? ' 🔖 ' : ''}
                  {verse.text}
                  <TextUI
                    size={Math.round(quranFontSize * 0.72)}
                    weight="bold"
                    color={isPlaying ? TOKENS.colors.primaryDark : TOKENS.colors.primary}
                  >
                    {` ${verse.badge} `}
                  </TextUI>
                </TextUI>
              );
            })}
          </TextUI>
        </View>

        {/* Tafsir / Purpose Summary */}
        {currentSurah.tafsir ? (
          <View
            style={{
              backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : '#2A201A',
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: TOKENS.colors.primary,
              marginBottom: 20
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Feather name="book" size={16} color={TOKENS.colors.primaryDark} />
              <TextUI size={14} weight="bold" color={TOKENS.colors.primaryDark}>
                {t('مقاصد وتفسير السورة الميسر', 'Surah Objectives & Tafsir')}
              </TextUI>
            </View>
            <TextUI size={13} color={c.textPrimary} style={{ lineHeight: 22 }}>
              {currentSurah.tafsir}
            </TextUI>
          </View>
        ) : null}

        {/* Next / Prev Surah Navigation */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handlePrevSurah}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              backgroundColor: c.surface,
              paddingVertical: 14,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: c.border
            }}
          >
            <Feather name="arrow-right" size={16} color={c.textPrimary} />
            <TextUI size={13} weight="bold" color={c.textPrimary}>
              السورة السابقة
            </TextUI>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleNextSurah}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              backgroundColor: TOKENS.colors.primary,
              paddingVertical: 14,
              borderRadius: 14
            }}
          >
            <TextUI size={13} weight="bold" color="#FFFFFF">
              السورة التالية
            </TextUI>
            <Feather name="arrow-left" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Ayah Action Sheet Modal */}
      <Modal visible={actionModalVisible} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: c.bg,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <TextUI size={16} weight="bold" color={c.textPrimary}>
                خيارات الآية {toArabicNumber(activeAyah?.ayahNumber || 1)} • سورة {currentSurah.nameAr}
              </TextUI>
              <TouchableOpacity onPress={() => setActionModalVisible(false)}>
                <Feather name="x" size={20} color={c.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Verse text snippet */}
            <View
              style={{
                backgroundColor: c.surface,
                borderRadius: 14,
                padding: 14,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: c.border
              }}
            >
              <TextUI quran size={16} color={c.textPrimary} style={{ textAlign: 'center', lineHeight: 26 }}>
                ﴿ {activeAyah?.text} ﴾
              </TextUI>
            </View>

            {/* Action Buttons */}
            <View style={{ gap: 10 }}>
              {/* Play Audio */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setActionModalVisible(false);
                  if (activeAyah) playAyahAudio(activeAyah);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  backgroundColor: TOKENS.colors.primary,
                  padding: 14,
                  borderRadius: 14
                }}
              >
                <Feather name="play" size={18} color="#FFFFFF" />
                <TextUI size={14} weight="bold" color="#FFFFFF">
                  استمع للآية بصوت {currentReciterObj.nameAr}
                </TextUI>
              </TouchableOpacity>

              {/* Set Bookmark */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => toggleReadingBookmark(activeAyah?.ayahNumber || 1)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  backgroundColor: c.surface,
                  padding: 14,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: c.border
                }}
              >
                <Feather name="bookmark" size={18} color={TOKENS.colors.primary} />
                <TextUI size={14} weight="medium" color={c.textPrimary}>
                  حفظ علامة القراءة عند هذه الآية
                </TextUI>
              </TouchableOpacity>

              {/* Share Card */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => activeAyah && handleShareAyah(activeAyah)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  backgroundColor: c.surface,
                  padding: 14,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: c.border
                }}
              >
                <Feather name="share-2" size={18} color={TOKENS.colors.primary} />
                <TextUI size={14} weight="medium" color={c.textPrimary}>
                  مشاركة الآية الكريمة
                </TextUI>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reciter Selection Modal */}
      <Modal visible={reciterModalVisible} animationType="fade" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: c.bg, borderRadius: 20, padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <TextUI size={17} weight="bold" color={c.textPrimary}>
                اختر القارئ
              </TextUI>
              <TouchableOpacity onPress={() => setReciterModalVisible(false)}>
                <Feather name="x" size={20} color={c.textPrimary} />
              </TouchableOpacity>
            </View>

            {QURAN_RECITERS.map((r) => (
              <TouchableOpacity
                key={r.id}
                activeOpacity={0.8}
                onPress={() => {
                  triggerHaptic('light');
                  setSelectedReciter(r.id);
                  setReciterModalVisible(false);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderColor: c.border
                }}
              >
                <View>
                  <TextUI size={14} weight="bold" color={r.id === selectedReciter ? TOKENS.colors.primary : c.textPrimary}>
                    {r.nameAr}
                  </TextUI>
                  <TextUI size={11} color={c.textSecondary}>
                    {r.nameEn}
                  </TextUI>
                </View>
                {r.id === selectedReciter && (
                  <Feather name="check" size={18} color={TOKENS.colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
};
