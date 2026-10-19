import React, { useState } from 'react';
import { View, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { Header } from '../components/common/Header';
import { TextUI } from '../components/common/TextUI';
import { toArabicNumber } from '../services/prayerCalculation';
import { TOKENS, makeShadow } from '../constants/tokens';

const QURAN_DATA: any[] = require('../../assets/quran_complete_114.json');

export const QuranIndexScreen: React.FC = () => {
  const { goBack, navigate, theme, themeMode, t, setSelectedSurah, readingBookmark, triggerHaptic } = useApp();
  const [search, setSearch] = useState('');
  const c = theme;

  const filteredSurahs = QURAN_DATA.filter((s: any) => {
    if (!search) return true;
    const q = search.toLowerCase().trim();
    return (
      s.nameAr.includes(q) ||
      s.nameEn.toLowerCase().includes(q) ||
      s.id.toString() === q ||
      toArabicNumber(s.id) === q
    );
  });

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header
        title={t('المصحف الشريف', 'Holy Quran')}
        subtitle={t('١١٤ سورة • بالرسم العثماني المعتمد', '114 Surahs • Uthmanic Script')}
        onBack={goBack}
      />

      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 }}>
        {/* Search Bar */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: c.surface,
            borderRadius: 14,
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderWidth: 1,
            borderColor: c.border,
            gap: 8,
            marginBottom: 10
          }}
        >
          <Feather name="search" size={18} color={c.textSecondary} />
          <TextInput
            placeholder={t('ابحث برقم السورة أو اسمها...', 'Search surah name or number...')}
            placeholderTextColor={c.textSecondary}
            value={search}
            onChangeText={setSearch}
            style={{
              flex: 1,
              color: c.textPrimary,
              textAlign: 'right',
              fontSize: 14
            }}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Feather name="x" size={16} color={c.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Continue Reading Bookmark */}
        {readingBookmark && !search && (
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => {
              const target = QURAN_DATA.find((s) => s.id === readingBookmark.surahId) || QURAN_DATA[0];
              setSelectedSurah(target);
              navigate('quran_reader');
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: themeMode === 'light' ? TOKENS.colors.secondaryLight : '#382E28',
              borderRadius: 14,
              padding: 12,
              marginBottom: 10,
              borderWidth: 1,
              borderColor: TOKENS.colors.secondary
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: TOKENS.colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 10
              }}
            >
              <Feather name="bookmark" size={16} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <TextUI size={12} color={TOKENS.colors.primaryDark}>
                {t('آخر موضع قراءة', 'Last Read')}
              </TextUI>
              <TextUI size={14} weight="bold" color={TOKENS.colors.primaryDark}>
                {readingBookmark.surahName} • الآية {toArabicNumber(readingBookmark.ayah)}
              </TextUI>
            </View>
            <Feather name="chevron-left" size={18} color={TOKENS.colors.primaryDark} />
          </TouchableOpacity>
        )}
      </View>

      {/* Surahs FlatList with virtualization */}
      <FlatList
        data={filteredSurahs}
        keyExtractor={(item) => `surah-${item.id}`}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
        initialNumToRender={15}
        maxToRenderPerBatch={20}
        windowSize={7}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => {
              triggerHaptic('light');
              setSelectedSurah(item);
              navigate('quran_reader');
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: c.surface,
              borderRadius: 14,
              padding: 14,
              marginBottom: 8,
              borderWidth: 1,
              borderColor: c.border,
              ...makeShadow('0 1px 4px rgba(0,0,0,0.02)', '#000', 0.02, 2)
            }}
          >
            {/* Surah Number Icon */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : '#382A20',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: TOKENS.colors.primary
                }}
              >
                <TextUI size={13} weight="bold" color={TOKENS.colors.primaryDark}>
                  {toArabicNumber(item.id)}
                </TextUI>
              </View>

              <View>
                <TextUI size={16} weight="bold" color={c.textPrimary}>
                  سورة {item.nameAr}
                </TextUI>
                <TextUI size={12} color={c.textSecondary} style={{ marginTop: 2 }}>
                  {item.type} • {toArabicNumber(item.verses)} آية • الجزء {toArabicNumber(item.juz || 1)}
                </TextUI>
              </View>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <TextUI size={14} color={TOKENS.colors.secondary}>
                {item.nameEn}
              </TextUI>
              <TextUI size={11} color={c.textSecondary} style={{ marginTop: 2 }}>
                ص {toArabicNumber(item.mushafPageStart || 1)}
              </TextUI>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};
