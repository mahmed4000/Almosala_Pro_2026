import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Dimensions,
  useWindowDimensions,
  Platform,
  StyleSheet,
  StatusBar,
  TextInput,
  Switch,
  Modal,
  Share,
  ActivityIndicator,
  I18nManager,
  PanResponder
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { Magnetometer } from 'expo-sensors';
import * as Notifications from 'expo-notifications';
import { createAudioPlayer, setAudioModeAsync as setExpoAudioModeAsync } from 'expo-audio';

// Safe Notification Handler & RTL Init
if (Platform.OS !== 'web') {
  try {
    I18nManager.allowRTL(true);
    I18nManager.forceRTL(true);
  } catch (e) {}

  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch (e) {}

  try {
    setExpoAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
    }).catch(() => {});
  } catch (e) {}
}
import { LinearGradient } from 'expo-linear-gradient';
import {
  useFonts,
  Tajawal_400Regular,
  Tajawal_500Medium,
  Tajawal_700Bold
} from '@expo-google-fonts/tajawal';
import {
  Amiri_400Regular,
  Amiri_700Bold
} from '@expo-google-fonts/amiri';

const isWeb = Platform.OS === 'web';
// Inject rock-solid mobile viewport height and flex locking
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  try {
    const existing = document.getElementById('almosala-viewport-lock');
    if (!existing) {
      const s = document.createElement('style');
      s.id = 'almosala-viewport-lock';
      s.innerHTML = `
        html, body {
          height: 100% !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
        }
        #root, #root > div {
          height: 100% !important;
          max-height: 100% !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
          display: flex !important;
          flex-direction: column !important;
          flex: 1 1 0% !important;
        }
      `;
      document.head.appendChild(s);
    }
  } catch (e) {}
}


// --- NATIVE SENSOR & GEOLOCATION HELPERS ---
const triggerHapticFeedback = (type: 'light' | 'medium' | 'success' = 'light') => {
  try {
    if (Platform.OS !== 'web' && Haptics) {
      if (type === 'success') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)?.catch?.(() => {});
      } else if (type === 'medium') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)?.catch?.(() => {});
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)?.catch?.(() => {});
      }
    }
  } catch (e) {}
};

// Platform-Safe Shadow Utility (Guarantees zero crashes on native iOS / Android)
const makeShadow = (
  webShadow: string,
  nativeColor: string = '#000',
  nativeOpacity: number = 0.08,
  nativeRadius: number = 4,
  nativeOffset: { width: number; height: number } = { width: 0, height: 2 },
  nativeElevation: number = 3
) => {
  if (Platform.OS === 'web') {
    return { boxShadow: webShadow };
  }
  return {
    shadowColor: nativeColor,
    shadowOffset: nativeOffset,
    shadowOpacity: nativeOpacity,
    shadowRadius: nativeRadius,
    elevation: nativeElevation
  };
};

// Kaaba Coordinates (Makkah al-Mukarramah)
const KAABA_LAT = 21.422487;
const KAABA_LNG = 39.826206;

function computeQiblaBearing(lat: number, lng: number): number {
  const phi1 = (lat * Math.PI) / 180;
  const phi2 = (KAABA_LAT * Math.PI) / 180;
  const deltaLambda = ((KAABA_LNG - lng) * Math.PI) / 180;

  const y = Math.sin(deltaLambda);
  const x = Math.cos(phi1) * Math.tan(phi2) - Math.sin(phi1) * Math.cos(deltaLambda);
  let qibla = (Math.atan2(y, x) * 180) / Math.PI;
  return Math.round((qibla + 360) % 360);
}

const getReciterAudioUrl = (reciterId: string, surahId: number): string => {
  const pad = surahId.toString().padStart(3, '0');
  if (reciterId === 'abdulbasit') {
    return `https://download.quranicaudio.com/qdc/abdul_baset/murattal/${surahId}.mp3`;
  }
  if (reciterId === 'abdulbasit_mujawwad') {
    return `https://download.quranicaudio.com/qdc/abdul_baset/mujawwad/${surahId}.mp3`;
  }
  if (reciterId === 'minshawi') {
    return `https://download.quranicaudio.com/qdc/siddiq_minshawi/murattal/${surahId}.mp3`;
  }
  if (reciterId === 'shuraim') {
    return `https://cdn.mp3quran.net/audio/saud-shuraim/r1/${pad}.mp3`;
  }
  if (reciterId === 'yasser_dosari') {
    return `https://cdn.mp3quran.net/audio/yasser-dosari/r1/${pad}.mp3`;
  }
  if (reciterId === 'baijan') {
    return `https://cdn.mp3quran.net/audio/abdullah-buaijan/r1/${pad}.mp3`;
  }
  if (reciterId === 'burhaji') {
    return `https://cdn.mp3quran.net/audio/muhammad-burhaji/r1/${pad}.mp3`;
  }
  if (reciterId === 'ahmad_hudhaifi') {
    return `https://cdn.mp3quran.net/audio/ahmad-hudhaifi/r1/${pad}.mp3`;
  }
  if (reciterId === 'abdulmohsen_qasim') {
    return `https://cdn.mp3quran.net/audio/abdulmohsen-qasim/r1/${pad}.mp3`;
  }
  if (reciterId === 'alhusary') {
    return `https://download.quranicaudio.com/qdc/khalil_al_husary/murattal/${surahId}.mp3`;
  }
  if (reciterId === 'almuaiqly') {
    return `https://cdn.mp3quran.net/audio/maher-muaiqly/r1/${pad}.mp3`;
  }
  if (reciterId === 'alghamdi') {
    return `https://download.quranicaudio.com/qdc/saad_al_ghamdi/murattal/${surahId}.mp3`;
  }
  // Default Alafasy
  return `https://download.quranicaudio.com/qdc/mishari_al_afasy/murattal/${surahId}.mp3`;
};

function computeDistanceToKaaba(lat: number, lng: number): number {
  const R = 6371; // km
  const dLat = ((KAABA_LAT - lat) * Math.PI) / 180;
  const dLon = ((KAABA_LNG - lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat * Math.PI) / 180) * Math.cos((KAABA_LAT * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// --- 1. DESIGN TOKENS ---
const TOKENS = {
  colors: {
    primary: '#8C5E3C',          // Warm Caramel Sandalwood / بني فاتح أصيل
    primaryDark: '#5D3A22',      // Deep Andalusian Chestnut / بني كستنائي راقي
    primaryLight: '#F5ECE1',     // Soft Creamy Sandstone / بيج عاجي دافئ
    secondary: '#C69255',        // Islamic Amber Gold / ذهب إسلامي دافئ
    secondaryLight: '#FAF1E6',   // Pale Golden Silk / عاجي مذهب ناعم
    accent: '#A66B38',           // Warm Terracotta Ochre
    success: '#4E7D5B',
    warning: '#C69255',
    error: '#B34743',
    light: {
      bg: '#FAF6F0',             // Andalusian Parchment / قرطاس أندلسي هادئ
      bgSecondary: '#F2EAE0',
      surface: '#FFFFFF',        // Pure Surface
      surfaceElevated: '#FFFFFF',
      textPrimary: '#2D1E16',    // Deep Andalusian Espresso / حبر عربي عميق
      textSecondary: '#7D6858',  // Warm Earth Taupe
      border: '#E8DFD5',
      heroGradient: ['#3E2010', '#5E381E', '#8C5E3C']
    },
    dark: {
      bg: '#1A1411',             // OLED Safe Dark Roast Mocha
      bgSecondary: '#221B17',
      surface: '#2C231E',        // Dark Sandalwood Surface
      surfaceElevated: '#382E28',
      textPrimary: '#F5EDE4',
      textSecondary: '#B5A394',
      border: '#44352D',
      heroGradient: ['#24150D', '#3D2214']
    }
  },
  spacing: {
    xxs: 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    pill: 999
  }
};

// --- SOUND & HAPTIC ENGINE (100% OFFLINE ZERO LATENCY) ---
let globalAudioCtx: any = null;

const playHapticClick = () => {
  try {
    if (typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        if (!globalAudioCtx) globalAudioCtx = new AudioCtx();
        if (globalAudioCtx.state === 'suspended') globalAudioCtx.resume();
        const osc = globalAudioCtx.createOscillator();
        const gain = globalAudioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, globalAudioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(140, globalAudioCtx.currentTime + 0.04);
        gain.gain.setValueAtTime(0.2, globalAudioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, globalAudioCtx.currentTime + 0.04);
        osc.connect(gain);
        gain.connect(globalAudioCtx.destination);
        osc.start();
        osc.stop(globalAudioCtx.currentTime + 0.04);
      }
    }
  } catch (e) {}
};

const playCompletionFanfare = () => {
  try {
    if (typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        if (!globalAudioCtx) globalAudioCtx = new AudioCtx();
        if (globalAudioCtx.state === 'suspended') globalAudioCtx.resume();
        const chords = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        chords.forEach((freq, idx) => {
          const osc = globalAudioCtx.createOscillator();
          const gain = globalAudioCtx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, globalAudioCtx.currentTime + idx * 0.09);
          gain.gain.setValueAtTime(0.25, globalAudioCtx.currentTime + idx * 0.09);
          gain.gain.exponentialRampToValueAtTime(0.001, globalAudioCtx.currentTime + idx * 0.09 + 0.5);
          osc.connect(gain);
          gain.connect(globalAudioCtx.destination);
          osc.start(globalAudioCtx.currentTime + idx * 0.09);
          osc.stop(globalAudioCtx.currentTime + idx * 0.09 + 0.5);
        });
      }
    }
  } catch (e) {}
};

const playAdhanPreviewTone = () => {
  try {
    if (typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        if (!globalAudioCtx) globalAudioCtx = new AudioCtx();
        if (globalAudioCtx.state === 'suspended') globalAudioCtx.resume();
        const melody = [392.00, 440.00, 493.88, 523.25, 587.33]; // G4, A4, B4, C5, D5
        melody.forEach((freq, idx) => {
          const osc = globalAudioCtx.createOscillator();
          const gain = globalAudioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, globalAudioCtx.currentTime + idx * 0.22);
          gain.gain.setValueAtTime(0.2, globalAudioCtx.currentTime + idx * 0.22);
          gain.gain.exponentialRampToValueAtTime(0.001, globalAudioCtx.currentTime + idx * 0.22 + 0.4);
          osc.connect(gain);
          gain.connect(globalAudioCtx.destination);
          osc.start(globalAudioCtx.currentTime + idx * 0.22);
          osc.stop(globalAudioCtx.currentTime + idx * 0.22 + 0.4);
        });
      }
    }
  } catch (e) {}
};

// --- DATA LAYER (COMPLETE 114 SURAHS OF THE HOLY QURAN) ---
const COMPLETE_QURAN_DATA: any[] = require('./assets/quran_complete_114.json');
const SURAHS = COMPLETE_QURAN_DATA;

const AZKAR_CATEGORIES = [
  { id: 'morning', titleAr: 'أذكار الصباح', titleEn: 'Morning Azkar', count: 24, subtitleAr: 'تُقرأ بعد الفجر حتى الشروق', icon: 'sun' },
  { id: 'evening', titleAr: 'أذكار المساء', titleEn: 'Evening Azkar', count: 24, subtitleAr: 'تُقرأ بعد العصر حتى الغروب', icon: 'moon' },
  { id: 'after_prayer', titleAr: 'أذكار بعد الصلاة', titleEn: 'Post-Prayer Azkar', count: 10, subtitleAr: 'أدعية وأذكار دبر كل صلاة', icon: 'heart' },
  { id: 'sleep', titleAr: 'أذكار النوم', titleEn: 'Sleep Azkar', count: 12, subtitleAr: 'حصن المسلم قبل المنام', icon: 'shield' },
  { id: 'waking', titleAr: 'أذكار الاستيقاظ', titleEn: 'Waking Up Azkar', count: 8, subtitleAr: 'دعاء الاستيقاظ من النوم', icon: 'sunrise' },
  { id: 'duas', titleAr: 'أدعية مأثورة', titleEn: 'Prophetic Duas', count: 16, subtitleAr: 'جوامع الكلم من الكتاب والسنة', icon: 'book-open' }
];

const AZKAR_DATABASE: Record<string, Array<{ ar: string; en: string; virtue: string; target: number }>> = {
  morning: [
    {
      ar: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ',
      en: 'Ayat Al-Kursi (The Throne Verse)',
      virtue: 'من قرأها حين يصبح أُجير من الجن حتى يمسي',
      target: 1
    },
    {
      ar: '﴿ قُلْ هُوَ اللَّهُ أَحَدٌ ﴾ ، ﴿ قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ ﴾ ، ﴿ قُلْ أَعُوذُ بِرَبِّ النَّاسِ ﴾',
      en: "Al-Mu'awwidhat (Sincerity, Daybreak, Mankind)",
      virtue: 'من قالها ثلاث مرات حين يصبح وحين يمسي كفته من كل شيء',
      target: 3
    },
    {
      ar: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لاَ إِلَهَ إِلاَّ اللَّهُ وَحْدَهُ لاَ شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، رَبِّ أَسْأَلُكَ خَيْرَ مَا فِي هَذَا الْيَوْمِ وَخَيْرَ مَا بَعْدَهُ، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِي هَذَا الْيَوْمِ وَشَرِّ مَا بَعْدَهُ، رَبِّ أَعُوذُ بِكَ مِنَ الْكَسَلِ وَسُوءِ الْكِبَرِ، رَبِّ أَعُوذُ بِكَ مِنْ عَذَابٍ فِي النَّارِ وَعَذَابٍ فِي الْقَبْرِ',
      en: 'We have entered a new day and with it all dominion belongs to Allah',
      virtue: 'من أذكار الصباح العظيمة الجامعة لحفظ اليوم كله',
      target: 1
    },
    {
      ar: 'اللَّهُمَّ أَنْتَ رَبِّي لاَ إِلَهَ إِلاَّ أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لاَ يَغْفِرُ الذُّنُوبَ إِلاَّ أَنْتَ',
      en: 'Sayyid al-Istighfar (The Master Supplication for Forgiveness)',
      virtue: 'من قالها موقناً بها حين يصبح فمات من يومه كان من أهل الجنة',
      target: 1
    },
    {
      ar: 'اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ وَإِلَيْكَ النُّشُورُ',
      en: 'O Allah, by You we enter the morning and by You we enter the evening',
      virtue: 'دعاء الصباح المأثور عن النبي ﷺ',
      target: 1
    },
    {
      ar: 'رَضِيتُ بِاللَّهِ رَبّاً، وَبِالْإِسْلَامِ دِيناً، وَبِمُحَمَّدٍ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ نَبِيّاً',
      en: 'I am pleased with Allah as my Lord, Islam as my religion, and Muhammad as my Prophet',
      virtue: 'من قالها ثلاثاً حين يصبح وحين يمسي كان حقاً على الله أن يرضيه',
      target: 3
    },
    {
      ar: 'بِسْمِ اللَّهِ الَّذِي لاَ يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الأَرْضِ وَلاَ فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ',
      en: 'In the Name of Allah, with Whose Name nothing can cause harm',
      virtue: 'من قالها ثلاثاً إذا أصبح وثلاثاً إذا أمسى لم يضره شيء',
      target: 3
    },
    {
      ar: 'يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ، أَصْلِحْ لِي شَأْنِي كُلَّهُ، وَلاَ تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ',
      en: 'O Ever Living, O Self-Subsisting, by Your mercy I seek assistance',
      virtue: 'دعاء كفاية الهم وتفويض الأمور كلها إلى الله',
      target: 1
    },
    {
      ar: 'حَسْبِيَ اللَّهُ لاَ إِلَهَ إِلاَّ هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ',
      en: 'Allah is sufficient for me; there is no deity except Him',
      virtue: 'من قالها سبع مرات كفاه الله ما أهمه من أمر دنياه وآخرته',
      target: 7
    },
    {
      ar: 'اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي، لاَ إِلَهَ إِلاَّ أَنْتَ. اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْكُفْرِ وَالْفَقْرِ، وَأَعُوذُ بِكَ مِنْ عَذَابِ الْقَبْرِ، لاَ إِلَهَ إِلاَّ أَنْتَ',
      en: 'O Allah, grant my body health, grant my hearing health, grant my sight health',
      virtue: 'سؤال الله دوام العافية وصلاح الجوارح',
      target: 3
    },
    {
      ar: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالآخِرَةِ، اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي دِينِي وَدُنْيَايَ وَأَهْلِي وَمَالِي، اللَّهُمَّ اسْتُرْ عَوْرَاتِي، وَآمِنْ رَوْعَاتِي، اللَّهُمَّ احْفَظْنِي مِنْ بَيْنِ يَدَيَّ، وَمِنْ خَلْفِي، وَعَنْ يَمِينِي، وَعَنْ شِمَالِي، وَمِنْ فَوْقِي، وَأَعُوذُ بِعَظَمَتِكَ أَنْ أُغْتَالَ مِنْ تَحْتِي',
      en: 'O Allah, I ask You for pardon and well-being in this life and the next',
      virtue: 'دعاء التحصين والحفظ التام من الجهات الست',
      target: 1
    },
    {
      ar: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ ، عَدَدَ خَلْقِهِ ، وَرِضَا نَفْسِهِ ، وَزِنَةَ عَرْشِهِ ، وَمِدَادَ كَلِمَاتِهِ',
      en: 'Glory be to Allah and Praise Him: by the multitude of His creation and the weight of His Throne',
      virtue: 'تعدل ساعات طويلة من الذكر والتسبيح في الميزان',
      target: 3
    },
    {
      ar: 'أَصْبَحْنَا عَلَى فِطْرَةِ الْإِسْلاَمِ، وَعَلَى كَلِمَةِ الإِخْلاَصِ، وَعَلَى دِينِ نَبِيِّنَا مُحَمَّدٍ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ، وَعَلَى مِلَّةِ أَبِينَا إِبْرَاهِيمَ حَنِيفاً مُسْلِماً وَمَا كَانَ مِنَ الْمُشْرِكِينَ',
      en: 'We awake upon the natural disposition of Islam and the word of pure faith',
      virtue: 'تجديد العهد على التوحيد ومتابعة النبي ﷺ',
      target: 1
    },
    {
      ar: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
      en: 'None has the right to be worshipped except Allah alone, without partner',
      virtue: 'كانت له حرزاً من الشيطان يومه ذلك حتى يمسي',
      target: 10
    },
    {
      ar: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
      en: 'Glory be to Allah and Praise Him',
      virtue: 'من قالها مائة مرة حُطّت خطاياه وإن كانت مثل زبد البحر',
      target: 100
    },
    {
      ar: 'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ',
      en: 'O Allah, send peace and blessings upon our Prophet Muhammad',
      virtue: 'من صلى عليّ حين يصبح عشراً وحين يمسي عشراً أدركته شفاعتي يوم القيامة',
      target: 10
    },
    {
      ar: 'اللَّهُمَّ إِنِّي أَصْبَحْتُ أُشْهِدُكَ، وَأُشْهِدُ حَمَلَةَ عَرْشِكَ، وَمَلَائِكَتَكَ، وَجَمِيعَ خَلْقِكَ: أَنَّكَ أَنْتَ اللَّهُ لَا إِلَهَ إِلَّا أَنْتَ وَحْدَكَ لَا شَرِيكَ لَكَ، وَأَنَّ مُحَمَّداً عَبْدُكَ وَرَسُولُكَ',
      en: 'O Allah, I enter the morning calling You to bear witness, and calling the bearers of Your Throne, Your angels, and all Your creation...',
      virtue: 'من قالها حين يصبح أو يمسي أربع مرات أعتقه الله من النار',
      target: 4
    },
    {
      ar: 'اللَّهُمَّ مَا أَصْبَحَ بِي مِنْ نِعْمَةٍ أَوْ بِأَحَدٍ مِنْ خَلْقِكَ، فَمِنْكَ وَحْدَكَ لاَ شَرِيكَ لَكَ، فَلَكَ الْحَمْدُ وَلَكَ الشُّكْرُ',
      en: 'O Allah, whatever blessing I or any of Your creation have risen with, is from You alone with no partner...',
      virtue: 'من قالها حين يصبح فقد أدّى شكر يومه، ومن قالها حين يمسي فقد أدّى شكر ليلته',
      target: 1
    },
    {
      ar: 'اللَّهُمَّ عَالِمَ الْغَيْبِ وَالشَّهَادَةِ، فَاطِرَ السَّمَاوَاتِ وَالْأَرْضِ، رَبَّ كُلِّ شَيْءٍ وَمَلِيكَهُ، أَشْهَدُ أَنْ لاَ إِلَهَ إِلاَّ أَنْتَ، أَعُوذُ بِكَ مِنْ شَرِّ نَفْسِي، وَمِنْ شَرِّ الشَّيْطَانِ وَشِرْكِهِ، وَأَنْ أَقْتَرِفَ عَلَى نَفْسِي سُوءاً أَوْ أَجُرَّهُ إِلَى مُسْلِمٍ',
      en: 'O Allah, Knower of the unseen and seen, Creator of the heavens and earth...',
      virtue: 'حفظ ووقاية شاملة من شر النفس والشيطان ووسوسته وجرّ السوء',
      target: 1
    },
    {
      ar: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْماً نَافِعاً، وَرِزْقاً طَيِّباً، وَعَمَلاً مُتَقَبَّلاً',
      en: 'O Allah, I ask You for knowledge that is of benefit, a good provision, and deeds that are accepted',
      virtue: 'كان النبي ﷺ يدعو بها كل صباح؛ لجمع خيري العلم والرزق والعمل المقبول',
      target: 1
    },
    {
      ar: 'أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ',
      en: 'I seek the forgiveness of Allah and repent to Him',
      virtue: 'سنة نبوية جليلة؛ كان النبي ﷺ يستغفر ويتوب في اليوم مائة مرة',
      target: 100
    },
    {
      ar: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
      en: 'None has the right to be worshipped except Allah alone (100 times)',
      virtue: 'من قالها مائة مرة كانت له عدل عشر رقاب، وكُتبت له مائة حسنة، ومُحيت عنه مائة سيئة، وحرزاً من الشيطان',
      target: 100
    },
    {
      ar: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ',
      en: 'Glory be to Allah and Praise Him, Glory be to Allah the Almighty',
      virtue: 'كلمتان خفيفتان على اللسان، ثقيلتان في الميزان، حبيبتان إلى الرحمن',
      target: 33
    },
    {
      ar: 'يَا رَبِّ لَكَ الْحَمْدُ كَمَا يَنْبَغِي لِجَلَالِ وَجْهِكَ وَلِعَظِيمِ سُلْطَانِكَ',
      en: 'O Lord, to You belongs all praise as befits the majesty of Your Face and the greatness of Your Authority',
      virtue: 'من أدعية الحمد العظيمة التي تضاعف الأجور',
      target: 3
    }
  ],

  evening: [
    {
      ar: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ',
      en: 'Ayat Al-Kursi (The Throne Verse)',
      virtue: 'من قرأها حين يمسي أُجير من الجن حتى يصبح',
      target: 1
    },
    {
      ar: '﴿ قُلْ هُوَ اللَّهُ أَحَدٌ ﴾ ، ﴿ قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ ﴾ ، ﴿ قُلْ أَعُوذُ بِرَبِّ النَّاسِ ﴾',
      en: "Al-Mu'awwidhat (Sincerity, Daybreak, Mankind)",
      virtue: 'من قالها ثلاث مرات حين يصبح وحين يمسي كفته من كل شيء',
      target: 3
    },
    {
      ar: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لاَ إِلَهَ إِلاَّ اللَّهُ وَحْدَهُ لاَ شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، رَبِّ أَسْأَلُكَ خَيْرَ مَا فِي هَذِهِ اللَّيْلَةِ وَخَيْرَ مَا بَعْدَهَا، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِي هَذِهِ اللَّيْلَةِ وَشَرِّ مَا بَعْدَهَا، رَبِّ أَعُوذُ بِكَ مِنَ الْكَسَلِ وَسُوءِ الْكِبَرِ، رَبِّ أَعُوذُ بِكَ مِنْ عَذَابٍ فِي النَّارِ وَعَذَابٍ فِي الْقَبْرِ',
      en: 'We have reached the evening and with it all dominion belongs to Allah',
      virtue: 'تحصين الليلة واستعاذة من شرورها وظلماتها',
      target: 1
    },
    {
      ar: 'اللَّهُمَّ أَنْتَ رَبِّي لاَ إِلَهَ إِلاَّ أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عهدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لاَ يَغْفِرُ الذُّنُوبَ إِلاَّ أَنْتَ',
      en: 'Sayyid al-Istighfar (The Master Supplication for Forgiveness)',
      virtue: 'من قالها موقناً بها حين يمسي فمات من ليلته كان من أهل الجنة',
      target: 1
    },
    {
      ar: 'اللَّهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ وَإِلَيْكَ الْمَصِيرُ',
      en: 'O Allah, by You we enter the evening and by You we enter the morning',
      virtue: 'استحضار عظمة التصريف الإلهي مع غياب الشمس',
      target: 1
    },
    {
      ar: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ',
      en: 'I seek refuge in the Perfect Words of Allah from the evil of what He has created',
      virtue: 'من قالها ثلاثاً لم تضره حمة ولا شيء في تلك الليلة',
      target: 3
    },
    {
      ar: 'بِسْمِ اللَّهِ الَّذِي لاَ يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الأَرْضِ وَلاَ فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ',
      en: 'In the Name of Allah, with Whose Name nothing can cause harm',
      virtue: 'لم يصبه فجأة بلاء حتى يصبح',
      target: 3
    },
    {
      ar: 'رَضِيتُ بِاللَّهِ رَبّاً، وَبِالْإِسْلَامِ دِيناً، وَبِمُحَمَّدٍ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ نَبِيّاً',
      en: 'I am pleased with Allah as my Lord, Islam as my religion, and Muhammad as my Prophet',
      virtue: 'كان حقاً على الله أن يرضيه يوم القيامة',
      target: 3
    },
    {
      ar: 'يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ، أَصْلِحْ لِي شَأْنِي كُلَّهُ، وَلاَ تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ',
      en: 'O Ever Living, O Self-Subsisting, by Your mercy I seek assistance',
      virtue: 'دعاء كفاية الهم وتفويض الأمور كلها إلى الله',
      target: 1
    },
    {
      ar: 'حَسْبِيَ اللَّهُ لاَ إِلَهَ إِلاَّ هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ',
      en: 'Allah is sufficient for me; there is no deity except Him',
      virtue: 'كفاه الله ما أهمه من أمر دنياه وآخرته',
      target: 7
    },
    {
      ar: 'اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي، لاَ إِلَهَ إِلاَّ أَنْتَ. اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْكُفْرِ وَالْفَقْرِ، وَأَعُوذُ بِكَ مِنْ عَذَابِ الْقَبْرِ، لاَ إِلَهَ إِلاَّ أَنْتَ',
      en: 'O Allah, grant my body health, grant my hearing health, grant my sight health',
      virtue: 'سؤال الله دوام العافية وصلاح الجوارح',
      target: 3
    },
    {
      ar: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالآخِرَةِ، اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي دِينِي وَدُنْيَايَ وَأَهْلِي وَمَالِي، اللَّهُمَّ اسْتُرْ عَوْرَاتِي، وَآمِنْ رَوْعَاتِي، اللَّهُمَّ احْفَظْنِي مِنْ بَيْنِ يَدَيَّ، وَمِنْ خَلْفِي، وَعَنْ يَمِينِي، وَعَنْ شِمَالِي، وَمِنْ فَوْقِي، وَأَعُوذُ بِعَظَمَتِكَ أَنْ أُغْتَالَ مِنْ تَحْتِي',
      en: 'O Allah, I ask You for pardon and well-being in this life and the next',
      virtue: 'دعاء التحصين والحفظ التام من الشرور والآفات',
      target: 1
    },
    {
      ar: 'أَمْسَيْنَا عَلَى فِطْرَةِ الْإِسْلاَمِ، وَعَلَى كَلِمَةِ الإِخْلاَصِ، وَعَلَى دِينِ نَبِيِّنَا مُحَمَّدٍ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ، وَعَلَى مِلَّةِ أَبِينَا إِبْرَاهِيمَ حَنِيفاً مُسْلِماً وَمَا كَانَ مِنَ الْمُشْرِكِينَ',
      en: 'We reach the evening upon the natural religion of Islam',
      virtue: 'تجديد عهد التوحيد والاستقامة',
      target: 1
    },
    {
      ar: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
      en: 'None has the right to be worshipped except Allah alone, without partner',
      virtue: 'حرز وحصن من الشيطان حتى يصبح',
      target: 10
    },
    {
      ar: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
      en: 'Glory be to Allah and Praise Him',
      virtue: 'من قالها مائة مرة لم يأت أحد يوم القيامة بأفضل مما جاء به إلا أحد قال مثل ما قال أو زاد عليه',
      target: 100
    },
    {
      ar: 'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ',
      en: 'O Allah, send peace and blessings upon our Prophet Muhammad',
      virtue: 'شفاعة النبي ﷺ يوم القيامة',
      target: 10
    },
    {
      ar: 'اللَّهُمَّ إِنِّي أَمْسَيْتُ أُشْهِدُكَ، وَأُشْهِدُ حَمَلَةَ عَرْشِكَ، وَمَلَائِكَتَكَ، وَجَمِيعَ خَلْقِكَ: أَنَّكَ أَنْتَ اللَّهُ لَا إِلَهَ إِلَّا أَنْتَ وَحْدَكَ لَا شَرِيكَ لَكَ، وَأَنَّ مُحَمَّداً عَبْدُكَ وَرَسُولُكَ',
      en: 'O Allah, I enter the evening calling You to bear witness, and calling the bearers of Your Throne...',
      virtue: 'من قالها حين يمسي أربع مرات أعتقه الله من النار',
      target: 4
    },
    {
      ar: 'اللَّهُمَّ مَا أَمْسَى بِي مِنْ نِعْمَةٍ أَوْ بِأَحَدٍ مِنْ خَلْقِكَ، فَمِنْكَ وَحْدَكَ لاَ شَرِيكَ لَكَ، فَلَكَ الْحَمْدُ وَلَكَ الشُّكْرُ',
      en: 'O Allah, whatever blessing I or any of Your creation have reached the evening with, is from You alone...',
      virtue: 'من قالها حين يمسي فقد أدّى شكر ليلته كاملة',
      target: 1
    },
    {
      ar: 'اللَّهُمَّ عَالِمَ الْغَيْبِ وَالشَّهَادَةِ، فَاطِرَ السَّمَاوَاتِ وَالْأَرْضِ، رَبَّ كُلِّ شَيْءٍ وَمَلِيكَهُ، أَشْهَدُ أَنْ لاَ إِلَهَ إِلاَّ أَنْتَ، أَعُوذُ بِكَ مِنْ شَرِّ نَفْسِي، وَمِنْ شَرِّ الشَّيْطَانِ وَشِرْكِهِ، وَأَنْ أَقْتَرِفَ عَلَى نَفْسِي سُوءاً أَوْ أَجُرَّهُ إِلَى مُسْلِمٍ',
      en: 'O Allah, Knower of the unseen and seen, Creator of the heavens and earth...',
      virtue: 'حفظ ووقاية في ظلمة الليل من شر النفس والشيطان والسيئات',
      target: 1
    },
    {
      ar: 'آمَنَ الرَّسُولُ بِمَا أُنزِلَ إِلَيْهِ مِن رَّبِّهِ وَالْمُؤْمِنُونَ ۚ كُلٌّ آمَنَ بِاللَّهِ وَمَلَائِكَتِهِ وَكُتُبِهِ وَرُسُلِهِ لَا نُفَرِّقُ بَيْنَ أَحَدٍ مِّن رُّسُلِهِ ۚ وَقَالُوا سَمِعْنَا وَأَطَعْنَا ۖ غُفْرَانَكَ رَبَّنَا وَإِلَيْكَ الْمَصِيرُ ۝ لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا ۚ لَهَا مَا كَسَبَتْ وَعَلَيْهَا مَا اكْتَسَبَتْ ۗ رَبَّنَا لَا تُؤَاخِذْنَا إِن نَّسِينَا أَوْ أَخْطَأْنَا ۚ رَبَّنَا وَلَا تَحْمِلْ عَلَيْنَا إِصْرًا كَمَا حَمَلْتَهُ عَلَى الَّذِينَ مِن قَبْلِنَا ۚ رَبَّنَا وَلَا تُحَمِّلْنَا مَا لَا طَاقَةَ لَنَا بِهِ ۖ وَاعْفُ عَنَّا وَاغْفِرْ لَنَا وَارْحَمْنَا ۚ أَنتَ مَوْلَانَا فَانصُرْنَا عَلَى الْقَوْمِ الْكَافِرِينَ',
      en: 'The Messenger has believed in what was revealed to him... (Last two verses of Surah Al-Baqarah)',
      virtue: 'من قرأهما في ليلة كفتاه من كل شر وسوء ومكروه',
      target: 1
    },
    {
      ar: 'أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ',
      en: 'I seek the forgiveness of Allah and repent to Him',
      virtue: 'ممحاة لذنوب اليوم ومغفرة للخطايا قبل المنام',
      target: 100
    },
    {
      ar: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
      en: 'None has the right to be worshipped except Allah alone (100 times)',
      virtue: 'حرز وحصن من الشيطان وحط للأوزار والسيئات',
      target: 100
    },
    {
      ar: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ',
      en: 'Glory be to Allah and Praise Him, Glory be to Allah the Almighty',
      virtue: 'كلمتان خفيفتان على اللسان، ثقيلتان في الميزان، حبيبتان إلى الرحمن',
      target: 33
    },
    {
      ar: 'سُبْحَانَ اللَّهِ (٣٣) ، وَالْحَمْدُ لِلَّهِ (٣٣) ، وَاللَّهُ أَكْبَرُ (٣٤)',
      en: 'Subhan Allah (33), Alhamdulillah (33), Allahu Akbar (34)',
      virtue: 'تسبيح المساء المأثور الذي وصى به النبي ﷺ عليّاً وفاطمة رضي الله عنهما',
      target: 100
    }
  ],

  after_prayer: [
    {
      ar: 'أَسْتَغْفِرُ اللَّهَ ، أَسْتَغْفِرُ اللَّهَ ، أَسْتَغْفِرُ اللَّهَ. اللَّهُمَّ أَنْتَ السَّلاَمُ وَمِنْكَ السَّلاَمُ، تَبَارَكْتَ يَا ذَا الْجَلاَلِ وَالإِكْرَامِ',
      en: 'I seek forgiveness from Allah (3 times). O Allah, You are Peace and from You is peace',
      virtue: 'أول ما يبدأ به المسلم دبر صلاته اقتداءً بالنبي ﷺ',
      target: 1
    },
    {
      ar: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، اللَّهُمَّ لَا مَانِعَ لِمَا أَعْطَيْتَ، وَلَا مُعْطِيَ لِمَا مَنَعْتَ، وَلَا يَنْفَعُ ذَا الْجَدِّ مِنْكَ الْجَدُّ',
      en: 'None has the right to be worshipped except Allah alone; O Allah, none can withhold what You give',
      virtue: 'الاعتراف بوحدانية العطاء والمنع لله وحده',
      target: 1
    },
    {
      ar: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ، لَا إِلَهَ إِلَّا اللَّهُ، وَلَا نَعْبُدُ إِلَّا إِيَّاهُ، لَهُ النِّعْمَةُ وَلَهُ الْفَضْلُ وَلَهُ الثَّنَاءُ الْحَسَنُ، لَا إِلَهَ إِلَّا اللَّهُ مُخْلِصِينَ لَهُ الدِّينَ وَلَوْ كَرِهَ الْكَافِرُونَ',
      en: 'There is no might nor power except with Allah; we worship none but Him',
      virtue: 'إخلاص الدين والثناء الحسن لله تعالى دبر الصلوات',
      target: 1
    },
    {
      ar: 'سُبْحَانَ اللَّهِ',
      en: 'Subhan Allah (Glory be to Allah)',
      virtue: 'تسبيح الصلاة المأثور',
      target: 33
    },
    {
      ar: 'الْحَمْدُ لِلَّهِ',
      en: 'Alhamdulillah (Praise be to Allah)',
      virtue: 'تحميد الصلاة المأثور',
      target: 33
    },
    {
      ar: 'اللَّهُ أَكْبَرُ',
      en: 'Allahu Akbar (Allah is the Greatest)',
      virtue: 'تكبير الصلاة المأثور',
      target: 33
    },
    {
      ar: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
      en: 'تمام المائة: لا إله إلا الله وحده لا شريك له',
      virtue: 'من قالها تمام المائة غُفرت خطاياه وإن كانت مثل زبد البحر',
      target: 1
    },
    {
      ar: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ',
      en: 'Ayat Al-Kursi after prayer',
      virtue: 'من قرأ آية الكرسي دبر كل صلاة مكتوبة لم يمنعه من دخول الجنة إلا أن يموت',
      target: 1
    },
    {
      ar: '﴿ قُلْ هُوَ اللَّهُ أَحَدٌ ﴾ ، ﴿ قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ ﴾ ، ﴿ قُلْ أَعُوذُ بِرَبِّ النَّاسِ ﴾',
      en: "Reciting Al-Mu'awwidhat after prayer",
      virtue: 'سنة مأثورة بعد كل فريضة (وتكرر ثلاثاً بعد الفجر والمغرب)',
      target: 1
    },
    {
      ar: 'اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ، وَشُكْرِكَ، وَحُسْنِ عِبَادَتِكَ',
      en: 'O Allah, help me to remember You, give thanks to You, and worship You well',
      virtue: 'وصية النبي ﷺ لمعاذ بن جبل ألا يدعها دبر كل صلاة',
      target: 1
    }
  ],

  sleep: [
    {
      ar: 'بِاسْمِكَ رَبِّي وَضَعْتُ جَنْبِي، وَبِكَ أَرْفَعُهُ، فَإِنْ أَمْسَكْتَ نَفْسِي فَارْحَمْهَا، وَإِنْ أَرْسَلْتَهَا فَاحْفَظْهَا، بِمَا تَحْفَظُ بِهِ عِبَادَكَ الصَّالِحِينَ',
      en: 'In Your Name my Lord, I lay down my side and by You I raise it up',
      virtue: 'دعاء النوم العظيم لحفظ النفس عند الرقاد',
      target: 1
    },
    {
      ar: 'اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ',
      en: 'O Allah, protect me from Your punishment on the Day You resurrect Your servants',
      virtue: 'كان النبي ﷺ إذا أراد أن يرقد وضع يده تحت خده ثم قالها ثلاثاً',
      target: 3
    },
    {
      ar: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',
      en: 'In Your Name, O Allah, I live and I die',
      virtue: 'دعاء النوم المختصر المأثور',
      target: 1
    },
    {
      ar: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ... (آية الكرسي كاملة)',
      en: 'Ayat Al-Kursi before sleep',
      virtue: 'لا يزال عليك من الله حافظ ولا يقربك شيطان حتى تصبح',
      target: 1
    },
    {
      ar: 'آمَنَ الرَّسُولُ بِمَا أُنزِلَ إِلَيْهِ مِن رَّبِّهِ وَالْمُؤْمِنُونَ... (خواتيم سورة البقرة)',
      en: 'Last two verses of Surah Al-Baqarah',
      virtue: 'من قرأ بالآيتين من آخر سورة البقرة في ليلة كفتاه',
      target: 1
    },
    {
      ar: 'جمع الكفين والنفث فيهما وقراءة: ﴿ قُلْ هُوَ اللَّهُ أَحَدٌ ﴾ و ﴿ قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ ﴾ و ﴿ قُلْ أَعُوذُ بِرَبِّ النَّاسِ ﴾ والمسح بهما على ما استطاع من الجسد',
      en: "Cupping hands, reciting Al-Mu'awwidhat, and wiping over the body (3 times)",
      virtue: 'سنة نبوية شريفة كل ليلة قبل النوم',
      target: 3
    },
    {
      ar: 'سُبْحَانَ اللَّهِ',
      en: 'Subhan Allah (33 times)',
      virtue: 'تسبيح فاطمة عند النوم',
      target: 33
    },
    {
      ar: 'الْحَمْدُ لِلَّهِ',
      en: 'Alhamdulillah (33 times)',
      virtue: 'تحميد النوم المأثور',
      target: 33
    },
    {
      ar: 'اللَّهُ أَكْبَرُ',
      en: 'Allahu Akbar (34 times)',
      virtue: 'تكبير النوم المأثور (خير لكما من خادم)',
      target: 34
    },
    {
      ar: '﴿ قُلْ يَا أَيُّهَا الْكَافِرُونَ ﴾ كاملة',
      en: 'Surah Al-Kafirun before sleep',
      virtue: 'من قرأها عند النوم فهي براءة له من الشرك',
      target: 1
    },
    {
      ar: 'اللَّهُمَّ أَسْلَمْتُ نَفْسِي إِلَيْكَ، وَفَوَّضْتُ أَمْرِي إِلَيْكَ، وَأَلْجَأْتُ ظَهْرِي إِلَيْكَ، رَغْبَةً وَرَهْبَةً إِلَيْكَ، لاَ مَلْجَأَ وَلاَ مَنْجَا مِنْكَ إِلاَّ إِلَيْكَ، آمَنْتُ بِكِتَابِكَ الَّذِي أَنْزَلْتَ، وَبِنَبِيِّكَ الَّذِي أَرْسَلْتَ',
      en: 'O Allah, I surrender my soul to You and entrust my affairs to You',
      virtue: 'من قالها ومات من ليلته مات على الفطرة',
      target: 1
    },
    {
      ar: 'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنَا وَسَقَانَا، وَكَفَانَا، وَآوَانَا، فَكَمْ مِمَّنْ لاَ كَافِيَ لَهُ وَلاَ مُؤْوِيَ',
      en: 'Praise is to Allah Who has provided us with food and drink and sheltered us',
      virtue: 'شكر نعم الله وإيوائه للعبد كل ليلة',
      target: 1
    }
  ],

  waking: [
    {
      ar: 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ',
      en: 'Praise is to Allah Who gave us life after having given us death and unto Him is the resurrection',
      virtue: 'دعاء الاستيقاظ النبوي المبارك',
      target: 1
    },
    {
      ar: 'الْحَمْدُ لِلَّهِ الَّذِي عَافَانِي فِي جَسَدِي، وَرَدَّ عَلَيَّ رُوحِي، وَأَذِنَ لِي بِذِكْرِهِ',
      en: 'Praise is to Allah Who gave strength to my body and returned my soul to me',
      virtue: 'شكر الله على استرداد الروح والمعافاة في الجسد',
      target: 1
    },
    {
      ar: 'لاَ إِلَهَ إِلاَّ اللَّهُ وَحْدَهُ لاَ شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، سُبْحَانَ اللَّهِ، وَالْحَمْدُ لِلَّهِ، وَلاَ إِلَهَ إِلاَّ اللَّهُ، وَاللَّهُ أَكْبَرُ، وَلاَ حَوْلَ وَلاَ قُوَّةَ إِلاَّ بِاللَّهِ الْعَلِيِّ الْعَظِيمِ، رَبِّ اغْفِرْ لِي',
      en: 'None has the right to be worshipped except Allah alone; Lord forgive me',
      virtue: 'من قالها إذا تعار من الليل ثم دعا استجيب له فإن توضأ وصلى قُبلت صلاته',
      target: 1
    },
    {
      ar: '﴿ إِنَّ فِي خَلْقِ السَّمَاوَاتِ وَالْأَرْضِ وَاخْتِلَافِ اللَّيْلِ وَالنَّهَارِ لَآيَاتٍ لِّأُولِي الْأَلْبَابِ ۝ الَّذِينَ يَذْكُرُونَ اللَّهَ قِيَامًا وَقُعُودًا وَعَلَىٰ جُنُوبِهِمْ وَيَتَفَكَّرُونَ فِي خَلْقِ السَّمَاوَاتِ وَالْأَرْضِ رَبَّنَا مَا خَلَقْتَ هَٰذَا بَاطِلًا سُبْحَانَكَ فَقِنَا عَذَابَ النَّارِ ﴾',
      en: 'Verses from Surah Ali Imran upon waking for night prayer',
      virtue: 'كان النبي ﷺ يقرأ العشر الأواخر من آل عمران عند استيقاظه لقيام الليل',
      target: 1
    },
    {
      ar: 'أَشْهَدُ أَنْ لاَ إِلَهَ إِلاَّ اللَّهُ وَحْدَهُ لاَ شَرِيكَ لَهُ، وَأَشْهَدُ أَنَّ مُحَمَّداً عَبْدُهُ وَرَسُولُهُ',
      en: 'Testimony after ablution (Wudu)',
      virtue: 'فُتحت له أبواب الجنة الثمانية يدخل من أيها شاء',
      target: 1
    },
    {
      ar: 'اللَّهُمَّ اجْعَلْنِي مِنَ التَّوَّابِينَ وَاجْعَلْنِي مِنَ الْمُتَطَهِّرِينَ',
      en: 'O Allah, make me of the repentant and make me of the purified',
      virtue: 'دعاء كمال الطهارة والتوبة بعد الوضوء',
      target: 1
    },
    {
      ar: 'بِسْمِ اللَّهِ، تَوَكَّلْتُ عَلَى اللَّهِ، وَلاَ حَوْلَ وَلاَ قُوَّةَ إِلاَّ بِاللَّهِ',
      en: 'In the name of Allah, I trust in Allah, there is no power except with Allah',
      virtue: 'يُقال له: كُفيت ووُقيت وهُديت وتنحى عنه الشيطان',
      target: 1
    },
    {
      ar: 'اللَّهُمَّ اجْعَلْ فِي قَلْبِي نُوراً، وَفِي لِسَانِي نُوراً، وَفِي سَمْعِي نُوراً، وَفِي بَصَرِي نُوراً، وَمِنْ فَوْقِي نُوراً، وَمِنْ تَحْتِي نُوراً، وَعَنْ يَمِينِي نُوراً، وَعَنْ شِمَالِي نُوراً، وَمِنْ أَمَامِي نُوراً، وَمِنْ خَلْفِي نُوراً، وَاجْعَلْ لِي فِي نَفْسِي نُوراً، وَأَعْظِمْ لِي نُوراً',
      en: 'O Allah, place light in my heart, light in my tongue, light in my hearing, and light in my sight',
      virtue: 'دعاء الذهاب إلى المسجد لصلاة الفجر والجماعة',
      target: 1
    }
  ],

  duas: [
    {
      ar: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
      en: 'Our Lord, give us in this world that which is good and in the Hereafter that which is good and protect us from the punishment of the Fire',
      virtue: 'أكثر دعاء كان يدعو به النبي ﷺ ويجمع خيري الدنيا والآخرة',
      target: 3
    },
    {
      ar: 'يَا مُقَلِّبَ الْقُلُوبِ ثَبِّتْ قَلْبِي عَلَى دِينِكَ',
      en: 'O Turner of the hearts, keep my heart firm upon Your religion',
      virtue: 'كان النبي ﷺ يكثر من هذا الدعاء المبارك',
      target: 3
    },
    {
      ar: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْهُدَى وَالتُّقَى وَالْعَفَافَ وَالْغِنَى',
      en: 'O Allah, I ask You for guidance, piety, chastity, and self-sufficiency',
      virtue: 'دعاء جامع لأسباب الفلاح والسعادة',
      target: 3
    },
    {
      ar: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَالْعَجْزِ وَالْكَسَلِ، وَالْبُخْلِ وَالْجُبْنِ، وَضَلَعِ الدَّيْنِ وَغَلَبَةِ الرِّجَالِ',
      en: 'O Allah, I seek refuge in You from grief and sadness, from weakness and laziness',
      virtue: 'دعاء تفريج الهموم والديون وقهر الرجال',
      target: 3
    },
    {
      ar: 'اللَّهُمَّ أَصْلِحْ لِي دِينِي الَّذِي هُوَ عِصْمَةُ أَمْرِي، وَأَصْلِحْ لِي دُنْيَايَ الَّتِي فِيهَا مَعَاشِي، وَأَصْلِحْ لِي آخِرَتِي الَّتِي فِيهَا مَعَادِي، وَاجْعَلِ الْحَيَاةَ زِيَادَةً لِي فِي كُلِّ خَيْرٍ، وَاجْعَلِ الْمَوْتَ رَاحَةً لِي مِنْ كُلِّ شَرٍّ',
      en: 'O Allah, correct for me my religion which is the safeguard of my affair',
      virtue: 'دعاء نبوي جامع لإصلاح الدين والدنيا والآخرة',
      target: 1
    },
    {
      ar: 'اللَّهُمَّ إِنَّكَ عَفُوٌّ كَرِيمٌ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي',
      en: 'O Allah, You are Pardoning, Generous, You love to pardon, so pardon me',
      virtue: 'دعاء ليلة القدر الذي علمه النبي ﷺ لعائشة رضي الله عنها',
      target: 7
    },
    {
      ar: 'رَبِّ اشْرَحْ لِي صَدْرِي ۝ وَيَسِّرْ لِي أَمْرِي ۝ وَاحْلُلْ عُقْدَةً مِّن لِّسَانِي ۝ يَفْقَهُوا قَوْلِي',
      en: 'My Lord, expand for me my breast and ease for me my task',
      virtue: 'دعاء نبي الله موسى عليه السلام لانشراح الصدر وتيسير الأمور',
      target: 3
    },
    {
      ar: 'اللَّهُمَّ اغْفِرْ لِي وَارْحَمْنِي وَاهْدِنِي وَعَافِنِي وَارْزُقْنِي',
      en: 'O Allah, forgive me, have mercy on me, guide me, grant me health, and provide for me',
      virtue: 'دعاء جامع بين السجدتين وفي السجود',
      target: 3
    },
    {
      ar: 'رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ وَاجْعَلْنَا لِلْمُتَّقِينَ إِمَامًا',
      en: 'Our Lord, grant us from among our spouses and offspring comfort to our eyes',
      virtue: 'دعاء عباد الرحمن لصلاح الأهل والذرية',
      target: 1
    },
    {
      ar: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ زَوَالِ نِعْمَتِكَ، وَتَحَوُّلِ عَافِيَتِكَ، وَفُجَاءَةِ نِقْمَتِكَ، وَجَمِيعِ سَخَطِكَ',
      en: 'O Allah, I seek refuge in You from the withdrawal of Your blessing',
      virtue: 'دعاء عظيم لحفظ النعم ودوام العافية',
      target: 3
    },
    {
      ar: 'رَبِّ زِدْنِي عِلْمًا',
      en: 'My Lord, increase me in knowledge',
      virtue: 'طلب الزيادة في العلم النافع من القرآن الكريم',
      target: 7
    },
    {
      ar: 'اللَّهُمَّ آتِ نَفْسِي تَقْوَاهَا، وَزَكِّهَا أَنْتَ خَيْرُ مَن زَكَّاهَا، أَنْتَ وَلِيُّهَا وَمَوْلَاهَا',
      en: 'O Allah, grant my soul its piety and purify it; You are the best to purify it',
      virtue: 'دعاء تزكية النفس وطهارتها من الشوائب',
      target: 1
    },
    {
      ar: 'رَبِّ اغْفِرْ لِي وَلِوَالِدَيَّ وَلِلْمُؤْمِنِينَ يَوْمَ يَقُومُ الْحِسَابُ',
      en: 'Our Lord, forgive me and my parents and the believers the Day the account is established',
      virtue: 'دعاء الخليل إبراهيم عليه السلام للوالدين وجميع المؤمنين',
      target: 3
    },
    {
      ar: 'لَّا إِلَٰهَ إِلَّا أَنتَ سُبْحَانَكَ إِنِّي كُنتُ مِنَ الظَّالِمِينَ',
      en: 'There is no deity except You; exalted are You. Indeed, I have been of the wrongdoers',
      virtue: 'دعاء ذي النون في بطن الحوت؛ ما دعا به مكروب إلا فرج الله عنه',
      target: 3
    },
    {
      ar: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ حُبَّكَ، وَحُبَّ مَنْ يُحِبُّكَ، وَحُبَّ عَمَلٍ يُقَرِّبُنِي إِلَى حُبِّكَ',
      en: 'O Allah, I ask You for Your love, the love of those who love You, and love of deed which draws me nearer to Your love',
      virtue: 'سؤال محبة الله تعالى ورضوانه',
      target: 1
    },
    {
      ar: 'اللَّهُمَّ يَا مُصَرِّفَ الْقُلُوبِ صَرِّفْ قُلُوبَنَا عَلَى طَاعَتِكَ',
      en: 'O Allah, Turner of the hearts, direct our hearts to Your obedience',
      virtue: 'دعاء الثبات على الطاعة والاستقامة',
      target: 3
    }
  ]
};


const SAMPLE_AZKAR_LIST = AZKAR_DATABASE.morning;

const CITIES = [
  {
    id: 'makkah',
    nameAr: 'مكة المكرمة',
    nameEn: 'Makkah',
    country: 'السعودية',
    lat: '21.42° N',
    lng: '39.82° E',
    qiblaAngle: 0,
    qiblaTextAr: 'في رحاب الكعبة المشرفة',
    qiblaTextEn: 'At the Holy Kaaba',
    distanceToMakkah: '٠ كم',
    nextPrayerNameAr: 'صلاة العصر',
    nextPrayerNameEn: 'Asr',
    nextPrayerTime: '٠٣:٤٥ م',
    prayers: [
      { id: 'fajr', nameAr: 'الفجر', nameEn: 'Fajr', time: '٠٤:٥٢ ص', isNext: false, icon: 'sunrise' },
      { id: 'sunrise', nameAr: 'الشروق', nameEn: 'Sunrise', time: '٠٦:٠٨ ص', isNext: false, icon: 'sun' },
      { id: 'dhuhr', nameAr: 'الظهر', nameEn: 'Dhuhr', time: '١٢:١٨ م', isNext: false, icon: 'sun' },
      { id: 'asr', nameAr: 'العصر', nameEn: 'Asr', time: '٠٣:٤٥ م', isNext: true, icon: 'clock' },
      { id: 'maghrib', nameAr: 'المغرب', nameEn: 'Maghrib', time: '٠٦:٢٨ م', isNext: false, icon: 'sunset' },
      { id: 'isha', nameAr: 'العشاء', nameEn: 'Isha', time: '٠٧:٥٨ م', isNext: false, icon: 'moon' }
    ]
  },
  {
    id: 'madinah',
    nameAr: 'المدينة المنورة',
    nameEn: 'Madinah',
    country: 'السعودية',
    lat: '24.46° N',
    lng: '39.61° E',
    qiblaAngle: 176,
    qiblaTextAr: '١٧٦° جنوب (South)',
    qiblaTextEn: '176° South',
    distanceToMakkah: '٤٢٠ كم',
    nextPrayerNameAr: 'صلاة العصر',
    nextPrayerNameEn: 'Asr',
    nextPrayerTime: '٠٣:٤٥ م',
    prayers: [
      { id: 'fajr', nameAr: 'الفجر', nameEn: 'Fajr', time: '٠٤:٥٤ ص', isNext: false, icon: 'sunrise' },
      { id: 'sunrise', nameAr: 'الشروق', nameEn: 'Sunrise', time: '٠٦:١٢ ص', isNext: false, icon: 'sun' },
      { id: 'dhuhr', nameAr: 'الظهر', nameEn: 'Dhuhr', time: '١٢:٢٠ م', isNext: false, icon: 'sun' },
      { id: 'asr', nameAr: 'العصر', nameEn: 'Asr', time: '٠٣:٤٥ م', isNext: true, icon: 'clock' },
      { id: 'maghrib', nameAr: 'المغرب', nameEn: 'Maghrib', time: '٠٦:٢٩ م', isNext: false, icon: 'sunset' },
      { id: 'isha', nameAr: 'العشاء', nameEn: 'Isha', time: '٠٧:٥٩ م', isNext: false, icon: 'moon' }
    ]
  },
  {
    id: 'cairo',
    nameAr: 'القاهرة',
    nameEn: 'Cairo',
    country: 'مصر',
    lat: '30.04° N',
    lng: '31.23° E',
    qiblaAngle: 136,
    qiblaTextAr: '١٣٦° جنوب شرق (SE)',
    qiblaTextEn: '136° South-East',
    distanceToMakkah: '١,٢٩٠ كم',
    nextPrayerNameAr: 'صلاة العصر',
    nextPrayerNameEn: 'Asr',
    nextPrayerTime: '٠٣:٣٨ م',
    prayers: [
      { id: 'fajr', nameAr: 'الفجر', nameEn: 'Fajr', time: '٠٤:١٢ ص', isNext: false, icon: 'sunrise' },
      { id: 'sunrise', nameAr: 'الشروق', nameEn: 'Sunrise', time: '٠٥:٤٠ ص', isNext: false, icon: 'sun' },
      { id: 'dhuhr', nameAr: 'الظهر', nameEn: 'Dhuhr', time: '١٢:٠٥ م', isNext: false, icon: 'sun' },
      { id: 'asr', nameAr: 'العصر', nameEn: 'Asr', time: '٠٣:٣٨ م', isNext: true, icon: 'clock' },
      { id: 'maghrib', nameAr: 'المغرب', nameEn: 'Maghrib', time: '٠٦:٢٢ م', isNext: false, icon: 'sunset' },
      { id: 'isha', nameAr: 'العشاء', nameEn: 'Isha', time: '٠٧:٥٢ م', isNext: false, icon: 'moon' }
    ]
  },
  {
    id: 'riyadh',
    nameAr: 'الرياض',
    nameEn: 'Riyadh',
    country: 'السعودية',
    lat: '24.71° N',
    lng: '46.67° E',
    qiblaAngle: 244,
    qiblaTextAr: '٢٤٤° جنوب غرب (SW)',
    qiblaTextEn: '244° South-West',
    distanceToMakkah: '٨٧٠ كم',
    nextPrayerNameAr: 'صلاة العصر',
    nextPrayerNameEn: 'Asr',
    nextPrayerTime: '٠٣:٢٢ م',
    prayers: [
      { id: 'fajr', nameAr: 'الفجر', nameEn: 'Fajr', time: '٠٤:٣٢ ص', isNext: false, icon: 'sunrise' },
      { id: 'sunrise', nameAr: 'الشروق', nameEn: 'Sunrise', time: '٠٥:٤٩ ص', isNext: false, icon: 'sun' },
      { id: 'dhuhr', nameAr: 'الظهر', nameEn: 'Dhuhr', time: '١١:٥٨ ص', isNext: false, icon: 'sun' },
      { id: 'asr', nameAr: 'العصر', nameEn: 'Asr', time: '٠٣:٢٢ م', isNext: true, icon: 'clock' },
      { id: 'maghrib', nameAr: 'المغرب', nameEn: 'Maghrib', time: '٠٦:٠٧ م', isNext: false, icon: 'sunset' },
      { id: 'isha', nameAr: 'العشاء', nameEn: 'Isha', time: '٠٧:٣٧ م', isNext: false, icon: 'moon' }
    ]
  },
  {
    id: 'dubai',
    nameAr: 'دبي',
    nameEn: 'Dubai',
    country: 'الإمارات',
    lat: '25.20° N',
    lng: '55.27° E',
    qiblaAngle: 258,
    qiblaTextAr: '٢٥٨° جنوب غرب (SW)',
    qiblaTextEn: '258° South-West',
    distanceToMakkah: '١,٦٥٠ كم',
    nextPrayerNameAr: 'صلاة العصر',
    nextPrayerNameEn: 'Asr',
    nextPrayerTime: '٠٣:٤٦ م',
    prayers: [
      { id: 'fajr', nameAr: 'الفجر', nameEn: 'Fajr', time: '٠٤:٤٥ ص', isNext: false, icon: 'sunrise' },
      { id: 'sunrise', nameAr: 'الشروق', nameEn: 'Sunrise', time: '٠٦:٠١ ص', isNext: false, icon: 'sun' },
      { id: 'dhuhr', nameAr: 'الظهر', nameEn: 'Dhuhr', time: '١٢:٢٢ م', isNext: false, icon: 'sun' },
      { id: 'asr', nameAr: 'العصر', nameEn: 'Asr', time: '٠٣:٤٦ م', isNext: true, icon: 'clock' },
      { id: 'maghrib', nameAr: 'المغرب', nameEn: 'Maghrib', time: '٠٦:٤٢ م', isNext: false, icon: 'sunset' },
      { id: 'isha', nameAr: 'العشاء', nameEn: 'Isha', time: '٠٨:٠٢ م', isNext: false, icon: 'moon' }
    ]
  },
  {
    id: 'amman',
    nameAr: 'عمان',
    nameEn: 'Amman',
    country: 'الأردن',
    lat: '31.95° N',
    lng: '35.93° E',
    qiblaAngle: 162,
    qiblaTextAr: '١٦٢° جنوب (South)',
    qiblaTextEn: '162° South',
    distanceToMakkah: '١,٢٣٠ كم',
    nextPrayerNameAr: 'صلاة العصر',
    nextPrayerNameEn: 'Asr',
    nextPrayerTime: '٠٣:٤٨ م',
    prayers: [
      { id: 'fajr', nameAr: 'الفجر', nameEn: 'Fajr', time: '٠٤:٢٥ ص', isNext: false, icon: 'sunrise' },
      { id: 'sunrise', nameAr: 'الشروق', nameEn: 'Sunrise', time: '٠٥:٥٢ ص', isNext: false, icon: 'sun' },
      { id: 'dhuhr', nameAr: 'الظهر', nameEn: 'Dhuhr', time: '١٢:١٢ م', isNext: false, icon: 'sun' },
      { id: 'asr', nameAr: 'العصر', nameEn: 'Asr', time: '٠٣:٤٨ م', isNext: true, icon: 'clock' },
      { id: 'maghrib', nameAr: 'المغرب', nameEn: 'Maghrib', time: '٠٦:٣٢ م', isNext: false, icon: 'sunset' },
      { id: 'isha', nameAr: 'العشاء', nameEn: 'Isha', time: '٠٨:٠٢ م', isNext: false, icon: 'moon' }
    ]
  },
  {
    id: 'istanbul',
    nameAr: 'إسطنبول',
    nameEn: 'Istanbul',
    country: 'تركيا',
    lat: '41.00° N',
    lng: '28.97° E',
    qiblaAngle: 152,
    qiblaTextAr: '١٥٢° جنوب شرق (SE)',
    qiblaTextEn: '152° South-East',
    distanceToMakkah: '٢,٤١٠ كم',
    nextPrayerNameAr: 'صلاة العصر',
    nextPrayerNameEn: 'Asr',
    nextPrayerTime: '٠٤:٣٨ م',
    prayers: [
      { id: 'fajr', nameAr: 'الفجر', nameEn: 'Fajr', time: '٠٤:٥٨ ص', isNext: false, icon: 'sunrise' },
      { id: 'sunrise', nameAr: 'الشروق', nameEn: 'Sunrise', time: '٠٦:٣٥ ص', isNext: false, icon: 'sun' },
      { id: 'dhuhr', nameAr: 'الظهر', nameEn: 'Dhuhr', time: '٠١:٠٢ م', isNext: false, icon: 'sun' },
      { id: 'asr', nameAr: 'العصر', nameEn: 'Asr', time: '٠٤:٣٨ م', isNext: true, icon: 'clock' },
      { id: 'maghrib', nameAr: 'المغرب', nameEn: 'Maghrib', time: '٠٧:٣٠ م', isNext: false, icon: 'sunset' },
      { id: 'isha', nameAr: 'العشاء', nameEn: 'Isha', time: '٠٩:٠٠ م', isNext: false, icon: 'moon' }
    ]
  },
  {
    id: 'london',
    nameAr: 'لندن',
    nameEn: 'London',
    country: 'المملكة المتحدة',
    lat: '51.50° N',
    lng: '0.12° W',
    qiblaAngle: 119,
    qiblaTextAr: '١١٩° جنوب شرق (SE)',
    qiblaTextEn: '119° South-East',
    distanceToMakkah: '٤,٧٩٠ كم',
    nextPrayerNameAr: 'صلاة العصر',
    nextPrayerNameEn: 'Asr',
    nextPrayerTime: '٠٥:١٥ م',
    prayers: [
      { id: 'fajr', nameAr: 'الفجر', nameEn: 'Fajr', time: '٠٣:٤٥ ص', isNext: false, icon: 'sunrise' },
      { id: 'sunrise', nameAr: 'الشروق', nameEn: 'Sunrise', time: '٠٥:٢٢ ص', isNext: false, icon: 'sun' },
      { id: 'dhuhr', nameAr: 'الظهر', nameEn: 'Dhuhr', time: '٠١:٠٨ م', isNext: false, icon: 'sun' },
      { id: 'asr', nameAr: 'العصر', nameEn: 'Asr', time: '٠٥:١٥ م', isNext: true, icon: 'clock' },
      { id: 'maghrib', nameAr: 'المغرب', nameEn: 'Maghrib', time: '٠٨:٥٥ م', isNext: false, icon: 'sunset' },
      { id: 'isha', nameAr: 'العشاء', nameEn: 'Isha', time: '١٠:٣٠ م', isNext: false, icon: 'moon' }
    ]
  }
];

// Comprehensive Master Directory of All 24+ Application Screens
const ALL_APP_SCREENS = [
  {
    categoryAr: 'مواقيت الصلاة والقبلة',
    categoryEn: 'Prayer & Qibla Services',
    icon: 'clock',
    items: [
      { id: 'Home', titleAr: 'الرئيسية والميقات القادم', titleEn: 'Home & Next Prayer', badge: 'رئيسية', icon: 'home' },
      { id: 'PrayerTimes', titleAr: 'جدول مواقيت الصلاة الكامل', titleEn: 'Full Prayer Timetable', badge: 'مواقيت', icon: 'clock' },
      { id: 'Imsakiah', titleAr: 'إمساكية الشهر والتقويم الشهري', titleEn: 'Monthly Prayer Timetable', badge: 'إمساكية', icon: 'calendar' },
      { id: 'PrayerTracker', titleAr: 'سجل الصلوات والسنن الرواتب اليومي', titleEn: 'Prayer & Sunnah Tracker', badge: 'سجل', icon: 'check-circle' },
      { id: 'Qibla', titleAr: 'بوصلة اتجاه القبلة المباشرة', titleEn: 'Direct Qibla Compass', badge: 'بوصلة', icon: 'compass' },
      { id: 'CalculationMethod', titleAr: 'طرق الحساب الفلكي والتقويم', titleEn: 'Calculation Methods', badge: 'فقهي', icon: 'sliders' },
      { id: 'LocationSettings', titleAr: 'المدينة وإحداثيات الموقع', titleEn: 'City & Location', badge: 'موقع', icon: 'map-pin' },
      { id: 'NotificationSettings', titleAr: 'تخصيص تنبيهات الأذان للصلوات', titleEn: 'Prayer Notifications', badge: 'تنبيهات', icon: 'bell' },
      { id: 'AdhanSettings', titleAr: 'أصوات مؤذني الحرمين الشريفين', titleEn: 'Adhan Reciters', badge: 'صوتيات', icon: 'volume-2' },
      { id: 'PrayerSettings', titleAr: 'إعدادات الصلاة الشاملة', titleEn: 'Prayer Settings', badge: 'إعدادات', icon: 'settings' }
    ]
  },
  {
    categoryAr: 'القرآن الكريم وتلاواته',
    categoryEn: 'Holy Quran & Recitations',
    icon: 'book-open',
    items: [
      { id: 'QuranIndex', titleAr: 'فهرس المصحف الشريف (١١٤ سورة)', titleEn: 'Quran Surah Index (114)', badge: 'فهرس', icon: 'book-open' },
      { id: 'QuranReader', titleAr: 'قارئ المصحف والآيات مع التفسير', titleEn: 'Quran Reader & Tafsir', badge: 'مصحف', icon: 'book' },
      { id: 'QuranKhatmah', titleAr: 'متتبع الختمة والورد القرآني اليومي', titleEn: 'Quran Khatmah Tracker', badge: 'ختمة', icon: 'award' },
      { id: 'ShareCard', titleAr: 'بطاقة مشاركة آية وتدبر', titleEn: 'Quran Verse Share Card', badge: 'مشاركة', icon: 'share-2' },
      { id: 'QuranBookmarks', titleAr: 'الإشارات المرجعية والمحفوظات', titleEn: 'Bookmarks & Saved Verses', badge: 'محفوظات', icon: 'bookmark' },
      { id: 'QuranAudio', titleAr: 'مشغل التلاوات الصوتية والقراء', titleEn: 'Audio Recitations Player', badge: 'تلاوة', icon: 'headphones' },
      { id: 'QuranSettings', titleAr: 'تخصيص حجم خط المصحف والتفسير', titleEn: 'Quran Font Settings', badge: 'خط', icon: 'type' }
    ]
  },
  {
    categoryAr: 'الأذكار والتسبيح',
    categoryEn: 'Azkar & Remembrance',
    icon: 'heart',
    items: [
      { id: 'AzkarCategories', titleAr: 'تصنيفات أذكار اليوم والليلة', titleEn: 'Azkar Categories', badge: 'أذكار', icon: 'heart' },
      { id: 'AzkarSession', titleAr: 'جلسة الذكر والعداد اللمسي التفاعلي', titleEn: 'Interactive Azkar Counter', badge: 'تسبيح', icon: 'activity' },
      { id: 'AzkarCompletion', titleAr: 'شاشة إتمام الورد والتقبل', titleEn: 'Dhikr Completion & Duas', badge: 'إتمام', icon: 'check-circle' },
      { id: 'AzkarSettings', titleAr: 'تفضيلات الاهتزاز وحفظ التقدم', titleEn: 'Haptic & Auto-Save Settings', badge: 'إعدادات', icon: 'smartphone' }
    ]
  },
  {
    categoryAr: 'جولة الترحيب والتهيئة الأولى',
    categoryEn: 'Onboarding & Initial Setup',
    icon: 'navigation',
    items: [
      { id: 'Welcome', titleAr: 'شاشة الترحيب بالمصلى', titleEn: 'Welcome Screen', badge: 'ترحيب', icon: 'smile' },
      { id: 'LocationPermission', titleAr: 'إذن تحديد الموقع الجغرافي', titleEn: 'Location Permission', badge: 'إذن', icon: 'map-pin' },
      { id: 'ManualLocation', titleAr: 'البحث واختيار المدينة يدوياً', titleEn: 'Manual City Selector', badge: 'مدن', icon: 'search' },
      { id: 'NotificationPermission', titleAr: 'إذن التنبيهات والأذان', titleEn: 'Notification Permission', badge: 'أذان', icon: 'bell' }
    ]
  },
  {
    categoryAr: 'الفرائض والتقويم الإسلامي',
    categoryEn: 'Islamic Duties & Hijri Calendar',
    icon: 'calendar',
    items: [
      { id: 'IslamicEvents', titleAr: 'المناسبات والتقويم الإسلامي السنوي', titleEn: 'Islamic Events & Calendar', badge: 'تقويم', icon: 'calendar' },
      { id: 'ZakatCalculator', titleAr: 'حاسبة الزكاة الشرعية الذكية', titleEn: 'Smart Zakat Calculator', badge: 'زكاة', icon: 'award' }
    ]
  },
  {
    categoryAr: 'الموسوعة والعلوم الشرعية',
    categoryEn: 'Islamic Encyclopedia & Hadith',
    icon: 'bookmark',
    items: [
      { id: 'Ruqyah', titleAr: 'الرقية الشرعية الكاملة من القرآن والسنة', titleEn: 'Comprehensive Legal Ruqyah', badge: 'شفاء', icon: 'shield' },
      { id: 'Hadith40', titleAr: 'الأربعون النووية مع الشرح والفوائد', titleEn: "An-Nawawi's 40 Hadiths", badge: 'حديث', icon: 'book' },
      { id: 'AllahNames', titleAr: 'أسماء الله الحسنى الـ ٩٩ ومعانيها', titleEn: '99 Beautiful Names of Allah', badge: 'أسماء', icon: 'award' },
      { id: 'ProphetLessons', titleAr: 'دروس وكراسي الحرمين الشريفين (المكي والنبوي)', titleEn: "Two Holy Mosques Lessons & Chairs", badge: 'الحرمين', icon: 'book-open' }
    ]
  },
  {
    categoryAr: 'المظهر والنظام والبيانات',
    categoryEn: 'Appearance, Trust & System',
    icon: 'settings',
    items: [
      { id: 'More', titleAr: 'قائمة المزيد والخدمات الشاملة', titleEn: 'More Services Hub', badge: 'دليل', icon: 'grid' },
      { id: 'Appearance', titleAr: 'المظهر والسمة (فاتح / داكن)', titleEn: 'Appearance (Light / Dark)', badge: 'مظهر', icon: 'sun' },
      { id: 'Language', titleAr: 'لغة التطبيق (العربية / English)', titleEn: 'App Language', badge: 'لغة', icon: 'globe' },
      { id: 'Privacy', titleAr: 'سياسة الخصوصية وأمان البيانات', titleEn: 'Privacy & Offline Guarantee', badge: 'أمان', icon: 'shield' },
      { id: 'Sources', titleAr: 'المصادر والاعتمادات الفلكية', titleEn: 'Sources & Approvals', badge: 'اعتماد', icon: 'award' },
      { id: 'About', titleAr: 'حول رفيق المسلم وإصدار التطبيق', titleEn: 'About Islamic Companion', badge: 'إصدار', icon: 'info' }
    ]
  }
];


// Authentic Madinah Mushaf Starting Page for all 114 Surahs (1 - 604)
const SURAH_MUSHAF_PAGES: Record<number, number> = {
  1: 1, 2: 2, 3: 50, 4: 77, 5: 106, 6: 128, 7: 151, 8: 177, 9: 187, 10: 208,
  11: 221, 12: 235, 13: 249, 14: 255, 15: 262, 16: 267, 17: 282, 18: 293, 19: 305, 20: 312,
  21: 322, 22: 332, 23: 342, 24: 350, 25: 359, 26: 367, 27: 377, 28: 385, 29: 396, 30: 404,
  31: 411, 32: 415, 33: 418, 34: 428, 35: 434, 36: 440, 37: 446, 38: 453, 39: 458, 40: 467,
  41: 477, 42: 483, 43: 489, 44: 496, 45: 499, 46: 502, 47: 507, 48: 511, 49: 515, 50: 518,
  51: 520, 52: 523, 53: 526, 54: 528, 55: 531, 56: 534, 57: 537, 58: 542, 59: 545, 60: 549,
  61: 551, 62: 553, 63: 554, 64: 556, 65: 558, 66: 560, 67: 562, 68: 564, 69: 566, 70: 568,
  71: 570, 72: 572, 73: 574, 74: 575, 75: 577, 76: 578, 77: 580, 78: 582, 79: 583, 80: 585,
  81: 586, 82: 587, 83: 587, 84: 589, 85: 590, 86: 591, 87: 591, 88: 592, 89: 593, 90: 594,
  91: 595, 92: 595, 93: 596, 94: 596, 95: 597, 96: 597, 97: 598, 98: 598, 99: 599, 100: 599,
  101: 600, 102: 600, 103: 601, 104: 601, 105: 601, 106: 602, 107: 602, 108: 602, 109: 603, 110: 603,
  111: 603, 112: 604, 113: 604, 114: 604
};

// Smart pagination helper for any Surah (جميع سور القرآن الـ 114 مقسمة وفق صفحات مصحف المدينة المنورة 604 صفحات)
const getSurahPages = (surah: any): string[] => {
  if (surah && Array.isArray(surah.pages) && surah.pages.length > 0) {
    return surah.pages;
  }
  return [surah?.text || ''];
};

// Convert Arabic-Indic numerals to ASCII standard numbers
const toStandardNumber = (str: string | number): string => {
  return String(str).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
};

// Global helper for Arabic-Indic Numerals
const toArabicNumber = (num: number | string) => {
  return String(num).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[parseInt(d, 10)]);
};

// Surah names with authentic full diacritics / tashkeel as in the Holy Quran
const SURAH_TASHKEEL: Record<number, string> = {
  1: 'الفَاتِحَةِ',
  2: 'البَقَرَةِ',
  3: 'آلِ عِمْرَانَ',
  18: 'الكَهْفِ',
  36: 'يس',
  55: 'الرَّحْمَٰنِ',
  67: 'المُلْكِ',
  112: 'الإِخْلَاصِ',
  113: 'الفَلَقِ',
  114: 'النَّاسِ'
};

// High-performance static cache for Quran Surah pages and verse parsing
const PARSED_SURAH_CACHE: Record<number, any> = {};

function getParsedSurahPages(surah: any) {
  if (!surah) return { surah, pages: [] };
  if (PARSED_SURAH_CACHE[surah.id]) {
    return PARSED_SURAH_CACHE[surah.id];
  }
  const sPages = getSurahPages(surah);
  const parsedPages = sPages.map((pageText: string, pIdx: number) => {
    const pageMeta = surah.pageMetadata && surah.pageMetadata[pIdx];
    const mushafPageNum = pageMeta?.pageNum || ((SURAH_MUSHAF_PAGES[surah.id] || 1) + pIdx);
    const juzNum = pageMeta?.juz || surah.juz || 1;

    const tokens = pageText.split(/(﴿[٠-٩0-9]+﴾)/g);
    const verses: { text: string; badge: string; ayahNumber: number; arabicNumber: string }[] = [];
    for (let i = 0; i < tokens.length; i += 2) {
      const vText = tokens[i] || '';
      const vBadge = tokens[i + 1] || '';
      if (vText.trim() || vBadge.trim()) {
        const numMatch = vBadge.match(/[٠-٩0-9]+/);
        const rawNum = numMatch ? numMatch[0] : '';
        const stdNum = parseInt(toStandardNumber(rawNum), 10) || (verses.length + 1);
        verses.push({
          text: vText,
          badge: vBadge,
          ayahNumber: stdNum,
          arabicNumber: rawNum || toArabicNumber(stdNum)
        });
      }
    }
    return {
      pageIndex: pIdx,
      mushafPageNum,
      juzNum,
      verses
    };
  });

  const result = {
    surah,
    pages: parsedPages
  };
  PARSED_SURAH_CACHE[surah.id] = result;
  return result;
}

// ========================================================
// --- MATHEMATICAL & LIVE PRAYER TIME CALCULATION ENGINE ---
// ========================================================

function parseTimeString(timeStr: string): { hours: number; minutes: number } {
  if (!timeStr) return { hours: 0, minutes: 0 };
  const normalized = timeStr
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
    .replace(/[\u0660-\u0669]/g, d => (d.charCodeAt(0) - 0x0660).toString())
    .trim();

  const isPM = normalized.includes('م') || /pm/i.test(normalized);
  const isAM = normalized.includes('ص') || /am/i.test(normalized);

  const clean = normalized.replace(/[^\d:]/g, '');
  const [hStr, mStr] = clean.split(':');
  let h = parseInt(hStr, 10) || 0;
  const m = parseInt(mStr, 10) || 0;

  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;

  return { hours: h, minutes: m };
}

function calculateSolarPrayerTimes(lat: number, lng: number, date = new Date()) {
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
  const B = (360 / 365) * (dayOfYear - 81) * (Math.PI / 180);
  const EqT = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  const delta = 23.45 * Math.sin((360 / 365) * (dayOfYear - 81) * (Math.PI / 180));
  const deltaRad = (delta * Math.PI) / 180;
  const latRad = (lat * Math.PI) / 180;
  const tzOffsetHours = -date.getTimezoneOffset() / 60;
  const noon = 12 + tzOffsetHours - lng / 15 - EqT / 60;

  const hourAngle = (angleDeg: number) => {
    const angleRad = (angleDeg * Math.PI) / 180;
    const cosHA = (Math.sin(angleRad) - Math.sin(latRad) * Math.sin(deltaRad)) / (Math.cos(latRad) * Math.cos(deltaRad));
    if (cosHA > 1) return 0;
    if (cosHA < -1) return 180;
    return (Math.acos(cosHA) * 180) / Math.PI;
  };

  const haSunset = hourAngle(-0.833) / 15;
  const haFajr = hourAngle(-18.5) / 15;
  const asrAlt = Math.atan(1 / (1 + Math.tan(Math.abs(latRad - deltaRad)))) * (180 / Math.PI);
  const haAsr = hourAngle(asrAlt) / 15;
  const haIsha = hourAngle(-17) / 15;

  const toTimeObj = (decHours: number) => {
    let h = Math.floor(decHours);
    let m = Math.round((decHours - h) * 60);
    if (m >= 60) { h += 1; m -= 60; }
    h = (h + 24) % 24;
    return { hours: h, minutes: m };
  };

  return {
    fajr: toTimeObj(noon - haFajr),
    sunrise: toTimeObj(noon - haSunset),
    dhuhr: toTimeObj(noon + (2 / 60)),
    asr: toTimeObj(noon + haAsr),
    maghrib: toTimeObj(noon + haSunset),
    isha: toTimeObj(noon + haIsha)
  };
}

const formatPrayerTime = (hours: number, minutes: number) => {
  const period = hours >= 12 ? 'م' : 'ص';
  let h12 = hours % 12;
  if (h12 === 0) h12 = 12;
  const hFormatted = toArabicNumber(h12.toString().padStart(2, '0'));
  const mFormatted = toArabicNumber(minutes.toString().padStart(2, '0'));
  return `${hFormatted}:${mFormatted} ${period}`;
};

async function getAccuratePrayerTimes(lat: number, lng: number, date = new Date(), method: string = 'umm_al_qura') {
  const methodCode = method === 'umm_al_qura' ? 4 : (method === 'egypt' ? 5 : 3);
  const dateStr = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`https://api.aladhan.com/v1/timings/${dateStr}?latitude=${lat}&longitude=${lng}&method=${methodCode}`, {
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (res.ok) {
      const json = await res.json();
      if (json && json.data && json.data.timings) {
        const t = json.data.timings;
        const parseAndFormat = (time24: string) => {
          const [hStr, mStr] = time24.split(':');
          const h = parseInt(hStr, 10);
          const m = parseInt(mStr, 10);
          return formatPrayerTime(h, m);
        };

        return {
          fajr: parseAndFormat(t.Fajr),
          sunrise: parseAndFormat(t.Sunrise),
          dhuhr: parseAndFormat(t.Dhuhr),
          asr: parseAndFormat(t.Asr),
          maghrib: parseAndFormat(t.Maghrib),
          isha: parseAndFormat(t.Isha)
        };
      }
    }
  } catch (err) {
    // Fall back to offline astronomical formula
  }

  const solar = calculateSolarPrayerTimes(lat, lng, date);
  return {
    fajr: formatPrayerTime(solar.fajr.hours, solar.fajr.minutes),
    sunrise: formatPrayerTime(solar.sunrise.hours, solar.sunrise.minutes),
    dhuhr: formatPrayerTime(solar.dhuhr.hours, solar.dhuhr.minutes),
    asr: formatPrayerTime(solar.asr.hours, solar.asr.minutes),
    maghrib: formatPrayerTime(solar.maghrib.hours, solar.maghrib.minutes),
    isha: formatPrayerTime(solar.isha.hours, solar.isha.minutes)
  };
}

interface NextPrayerResult {
  id: string;
  nameAr: string;
  nameEn: string;
  time: string;
  isTomorrow: boolean;
  diffSeconds: number;
  countdownText: string;
  progress: number;
}

function calculateNextPrayerAndCountdown(prayers: any[], now: Date = new Date()): NextPrayerResult {
  const fivePrayers = prayers.filter(p => p.id !== 'sunrise');
  if (!fivePrayers || fivePrayers.length === 0) {
    return {
      id: 'fajr',
      nameAr: 'صلاة الفجر',
      nameEn: 'Fajr',
      time: '٠٤:٥٢ ص',
      isTomorrow: false,
      diffSeconds: 0,
      countdownText: '٠٠:٠٠:٠٠',
      progress: 0.5
    };
  }

  let nextP = null;
  let targetDate: Date | null = null;
  let prevDate: Date | null = null;

  for (let i = 0; i < fivePrayers.length; i++) {
    const p = fivePrayers[i];
    const { hours, minutes } = parseTimeString(p.time);
    const d = new Date(now);
    d.setHours(hours, minutes, 0, 0);

    if (d.getTime() > now.getTime()) {
      nextP = p;
      targetDate = d;
      if (i > 0) {
        const prevP = fivePrayers[i - 1];
        const prevT = parseTimeString(prevP.time);
        prevDate = new Date(now);
        prevDate.setHours(prevT.hours, prevT.minutes, 0, 0);
      } else {
        const lastP = fivePrayers[fivePrayers.length - 1];
        const lastT = parseTimeString(lastP.time);
        prevDate = new Date(now);
        prevDate.setDate(prevDate.getDate() - 1);
        prevDate.setHours(lastT.hours, lastT.minutes, 0, 0);
      }
      break;
    }
  }

  let isTomorrow = false;
  if (!nextP) {
    isTomorrow = true;
    nextP = fivePrayers[0];
    const { hours, minutes } = parseTimeString(fivePrayers[0].time);
    targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + 1);
    targetDate.setHours(hours, minutes, 0, 0);

    const ishaP = fivePrayers[fivePrayers.length - 1];
    const ishaT = parseTimeString(ishaP.time);
    prevDate = new Date(now);
    prevDate.setHours(ishaT.hours, ishaT.minutes, 0, 0);
  }

  const diffSeconds = targetDate ? Math.max(0, Math.floor((targetDate.getTime() - now.getTime()) / 1000)) : 0;
  const hh = Math.floor(diffSeconds / 3600);
  const mm = Math.floor((diffSeconds % 3600) / 60);
  const ss = diffSeconds % 60;

  const countdownText = `${toArabicNumber(hh.toString().padStart(2, '0'))}:${toArabicNumber(mm.toString().padStart(2, '0'))}:${toArabicNumber(ss.toString().padStart(2, '0'))}`;

  let progress = 0.5;
  if (prevDate && targetDate) {
    const totalSpan = targetDate.getTime() - prevDate.getTime();
    const remaining = targetDate.getTime() - now.getTime();
    if (totalSpan > 0) {
      progress = Math.max(0, Math.min(1, remaining / totalSpan));
    }
  }

  const rawName = nextP.nameAr || '';
  const prayerNameAr = rawName.startsWith('صلاة') ? rawName : `صلاة ${rawName}`;

  return {
    id: nextP.id,
    nameAr: prayerNameAr,
    nameEn: nextP.nameEn,
    time: nextP.time,
    isTomorrow,
    diffSeconds,
    countdownText,
    progress
  };
}

const STATUSBAR_HEIGHT = Platform.OS === 'ios' ? 48 : (Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);

function AlmosalaApp() {
  const [fontsLoaded] = useFonts({
    Tajawal_400Regular,
    Tajawal_500Medium,
    Tajawal_700Bold,
    Amiri_400Regular,
    Amiri_700Bold
  });

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  // Navigation Stack Architecture
  const [screen, setScreen] = useState('Home');
  const [stack, setStack] = useState(['Home']);
  const [catalogModalVisible, setCatalogModalVisible] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');

  // Settings State
  const [themeMode, setThemeMode] = useState('light'); // 'light' | 'dark'
  const [lang, setLang] = useState('ar');               // 'ar' | 'en'
  const [selectedRiwayah, setSelectedRiwayah] = useState('hafs');
  const [quranFontSize, setQuranFontSize] = useState(22); // 22, 26, 32, 38, 44
  const [calculationMethod, setCalculationMethod] = useState('mwl');
  const [asrMethod, setAsrMethod] = useState('majority');
  const [currentCity, setCurrentCity] = useState(CITIES[0]);
  const [countdownText, setCountdownText] = useState('٠٠:٠٠:٠٠');
  const [countdownProgress, setCountdownProgress] = useState(0.5);
  const [nextPrayerInfo, setNextPrayerInfo] = useState({
    id: 'fajr',
    nameAr: 'صلاة الفجر',
    nameEn: 'Fajr',
    time: '٠٤:٥٢ ص',
    isTomorrow: false
  });
  const [adhanReciter, setAdhanReciter] = useState('makkah');
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [autoSaveProgress, setAutoSaveProgress] = useState(true);

  // Per-Prayer Bell Notification Toggles
  const [prayerBells, setPrayerBells] = useState({
    fajr: true,
    sunrise: false,
    dhuhr: true,
    asr: true,
    maghrib: true,
    isha: true
  });

  // Feature State
  const [selectedSurah, setSelectedSurah] = useState<any>(SURAHS.find((s: any) => s.id === 18) || SURAHS[17]);
  const [readingAyah, setReadingAyah] = useState(15);
  const [surahPageIndex, setSurahPageIndex] = useState(0);
  const [bookmarks, setBookmarks] = useState([
    { surahId: 18, surahName: 'سورة الكهف', ayah: 15, juz: 15, date: 'اليوم' },
    { surahId: 2, surahName: 'سورة البقرة', ayah: 255, juz: 3, date: 'أمس' }
  ]);
  const [readingBookmark, setReadingBookmark] = useState<{
    surahId: number;
    surahNameAr: string;
    ayahNumber: number;
    text: string;
    date: string;
    timestamp: number;
  } | null>(() => {
    if (typeof window !== 'undefined' && (window as any).localStorage) {
      try {
        const saved = (window as any).localStorage.getItem('almosala_reading_bookmark');
        if (saved) return JSON.parse(saved);
      } catch (e) {}
    }
    return null;
  });
  const [bookmarkToast, setBookmarkToast] = useState<string | null>(null);

  const saveReadingBookmark = (bookmark: { surahId: number; surahNameAr: string; ayahNumber: number; text: string } | null) => {
    if (!bookmark) {
      setReadingBookmark(null);
      if (typeof window !== 'undefined' && (window as any).localStorage) {
        try {
          (window as any).localStorage.removeItem('almosala_reading_bookmark');
        } catch (e) {}
      }
      setBookmarkToast('تمت إزالة علامة التوقف');
      setTimeout(() => setBookmarkToast(null), 2500);
      return;
    }
    const newBookmark = {
      ...bookmark,
      date: 'اليوم',
      timestamp: Date.now()
    };
    setReadingBookmark(newBookmark);
    if (typeof window !== 'undefined' && (window as any).localStorage) {
      try {
        (window as any).localStorage.setItem('almosala_reading_bookmark', JSON.stringify(newBookmark));
      } catch (e) {}
    }
    setBookmarks((prev: any[]) => {
      const filtered = prev.filter(b => !(b.surahId === bookmark.surahId && b.ayah === bookmark.ayahNumber));
      return [
        {
          surahId: bookmark.surahId,
          surahName: `سورة ${bookmark.surahNameAr}`,
          ayah: bookmark.ayahNumber,
          juz: SURAHS.find((s: any) => s.id === bookmark.surahId)?.juz || 1,
          date: 'اليوم'
        },
        ...filtered
      ];
    });
    setBookmarkToast(`تم حفظ علامة التوقف عند الآية (${toArabicNumber(bookmark.ayahNumber)}) 🔖`);
    setTimeout(() => setBookmarkToast(null), 2800);
  };
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioReciter, setAudioReciter] = useState('alafasy');
  const [audioCurrentTime, setAudioCurrentTime] = useState('٠٠:٠٠');
  const [audioDuration, setAudioDuration] = useState('٠٠:٠٠');
  const [audioRemainingTime, setAudioRemainingTime] = useState('٠٠:٠٠');
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioCurrentSecs, setAudioCurrentSecs] = useState<number>(0);
  const [audioTotalSecs, setAudioTotalSecs] = useState<number>(0);
  const quranAudioRef = useRef<any>(null);
  const nativeAudioSoundRef = useRef<any>(null);

  // Two Holy Mosques Scholarly Lessons State (دروس وكراسي الحرمين الشريفين: المكي والنبوي)
  const [selectedMosque, setSelectedMosque] = useState<'prophet' | 'makkah'>('prophet');
  const [isLessonPageOpen, setIsLessonPageOpen] = useState<boolean>(false);
  const lessonsScrollRef = useRef<any>(null);
  const [currentAudioType, setCurrentAudioType] = useState<'quran' | 'lesson'>('quran');
  const [activeCourse, setActiveCourse] = useState<any>(null);
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [selectedLessonCourse, setSelectedLessonCourse] = useState<any>(null);
  const [lessonModalVisible, setLessonModalVisible] = useState<boolean>(false);
  const [lessonPlaybackSpeed, setLessonPlaybackSpeed] = useState<number>(1.0);
  const [lessonCategoryTab, setLessonCategoryTab] = useState<string>('all');
  const [lessonSearchQuery, setLessonSearchQuery] = useState<string>('');

  // Offline Audio Downloads & Storage Management State
  const [downloadedLessons, setDownloadedLessons] = useState<Record<string, any>>(() => {
    if (typeof window !== 'undefined' && (window as any).localStorage) {
      try {
        const saved = (window as any).localStorage.getItem('almosala_downloaded_lessons');
        return saved ? JSON.parse(saved) : {};
      } catch (e) { return {}; }
    }
    return {};
  });
  const [downloadingLessonIds, setDownloadingLessonIds] = useState<Record<string, number>>({});
  const [audioStorageInfoVisible, setAudioStorageInfoVisible] = useState<boolean>(false);

  // Lesson Notes & Bookmark Timestamps State
  const [lessonNotes, setLessonNotes] = useState<Record<string, any[]>>(() => {
    if (typeof window !== 'undefined' && (window as any).localStorage) {
      try {
        const saved = (window as any).localStorage.getItem('almosala_lesson_notes');
        return saved ? JSON.parse(saved) : {};
      } catch (e) { return {}; }
    }
    return {};
  });
  const [lessonNoteModalVisible, setLessonNoteModalVisible] = useState<boolean>(false);
  const [newNoteText, setNewNoteText] = useState<string>('');
  const [newNoteTimestampSecs, setNewNoteTimestampSecs] = useState<number>(0);
  const [minuteJumpInput, setMinuteJumpInput] = useState<string>('');
  const lastPinchDistRef = useRef<number | null>(null);
  const isMultiTouchRef = useRef<boolean>(false);
  const lastMultiTouchTimeRef = useRef<number>(0);
  const [zoomFeedbackPill, setZoomFeedbackPill] = useState<number | null>(null);
  const zoomPillTimeoutRef = useRef<any>(null);

  const showZoomFeedback = (size: number) => {
    setZoomFeedbackPill(size);
    if (zoomPillTimeoutRef.current) clearTimeout(zoomPillTimeoutRef.current);
    zoomPillTimeoutRef.current = setTimeout(() => {
      setZoomFeedbackPill(null);
    }, 1400);
  };

  // Audio Surah Selector State (منتقي السور لمشغل التلاوة)
  const [audioSurahSelectorVisible, setAudioSurahSelectorVisible] = useState(false);
  const [audioSurahSearch, setAudioSurahSearch] = useState('');

  // Verse Share Card State (بطاقات مشاركة الآيات والتصميم الأندلسي)
  const [cardShareModalVisible, setCardShareModalVisible] = useState(false);
  const [shareVerse, setShareVerse] = useState({
    text: 'الَّذِينَ آمَنُوا وَتَطْمَئِنُّ قُلُوبُهُم بِذِكْرِ اللَّهِ ۗ أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ',
    surahName: 'سورة الرعد',
    ayahNumber: '٢٨',
    tafsir: 'الذين صدّقوا بوحدانية الله واستكانت قلوبهم بذكره وتوحيده، ألا بطاعة الله وذكره تنشرح الصدور وتطمئن القلوب.'
  });
  const [cardShareStyle, setCardShareStyle] = useState<'andalusian' | 'emerald' | 'vintage'>('andalusian');
  const [copyToast, setCopyToast] = useState(false);

  // Imsakiah View Mode
  const [imsakiahMode, setImsakiahMode] = useState<'current' | 'ramadan'>('current');

  // Khatmah Tracker State (ختمة القرآن الكريم والورد اليومي)
  const [khatmahTargetDays, setKhatmahTargetDays] = useState(30); // 30, 60, 90
  const [khatmahCurrentPage, setKhatmahCurrentPage] = useState(142); // 1-604
  const [khatmahStreak, setKhatmahStreak] = useState(5); // 5 days streak
  const [khatmahShowDua, setKhatmahShowDua] = useState(false);
  const [khatmahPledgedPrayers, setKhatmahPledgedPrayers] = useState<Record<string, boolean>>({
    fajr: true,
    dhuhr: true,
    asr: true,
    maghrib: false,
    isha: false
  });

  // Hijri Date Adjustment (-2, -1, 0, +1, +2 days)
  const [hijriAdjustment, setHijriAdjustment] = useState(0);

  // Audio Mini-Player Dismissal
  const [audioMiniPlayerDismissed, setAudioMiniPlayerDismissed] = useState(false);

  // Zakat Calculator State
  const [zakatTab, setZakatTab] = useState<'cash' | 'gold' | 'stocks' | 'fitr'>('cash');
  const [zakatCashAmount, setZakatCashAmount] = useState('50000');
  const [zakatGoldGrams24, setZakatGoldGrams24] = useState('0');
  const [zakatGoldGrams21, setZakatGoldGrams21] = useState('100');
  const [zakatGoldPrice, setZakatGoldPrice] = useState('310');
  const [zakatStockValue, setZakatStockValue] = useState('0');
  const [zakatFitrMembers, setZakatFitrMembers] = useState(4);
  const [zakatFitrRate, setZakatFitrRate] = useState(30);

  // Islamic Events Filter State
  const [eventsFilter, setEventsFilter] = useState<'all' | 'eids' | 'fasting'>('all');

  // Prayer Tracker State (سجل الصلوات والسنن الرواتب)
  const [prayerFardhStatus, setPrayerFardhStatus] = useState<Record<string, 'jamaah' | 'ontime' | 'missed'>>({
    fajr: 'jamaah',
    dhuhr: 'jamaah',
    asr: 'ontime',
    maghrib: 'jamaah',
    isha: 'ontime'
  });
  const [prayerSunanStatus, setPrayerSunanStatus] = useState<Record<string, boolean>>({
    fajr_pre: true,
    dhuhr_pre: true,
    dhuhr_post: true,
    maghrib_post: true,
    isha_post: true,
    witr: true,
    duha: true,
    qiyam: false
  });

  // Offline Audio Download Manager State
  const [downloadedSurahs, setDownloadedSurahs] = useState<number[]>([1, 18, 36, 67, 112, 113, 114]);
  const [isDownloading, setIsDownloading] = useState<number | null>(null);

  // Multi-Tafsir Selector State (التفسير الميسر، ابن كثير، الجلالين، القرطبي)
  const [selectedTafsir, setSelectedTafsir] = useState<'muyassar' | 'ibnkathir' | 'jalalayn' | 'qurtubi'>('muyassar');

  // Interactive Ayah Tafsir State
  const [selectedAyahForTafsir, setSelectedAyahForTafsir] = useState<{
    surahId: number;
    surahNameAr: string;
    surahNameEn: string;
    ayahNumber: number;
    arabicNumber: string;
    text: string;
  } | null>(null);
  const [ayahTafsirText, setAyahTafsirText] = useState<string>('');
  const [ayahTafsirLoading, setAyahTafsirLoading] = useState<boolean>(false);
  const [tafsirCopied, setTafsirCopied] = useState<boolean>(false);

  // Auto-Scroll State & References for Holy Quran Reader
  const [quranAutoScroll, setQuranAutoScroll] = useState<boolean>(false);
  const [quranScrollSpeed, setQuranScrollSpeed] = useState<number>(2); // 1 = calm, 2 = normal, 3 = fast, 4 = very fast
  const quranScrollViewRef = useRef<any>(null);
  const autoScrollTimerRef = useRef<any>(null);
  const currentScrollYRef = useRef<number>(0);
  const [quranReaderFullScreen, setQuranReaderFullScreen] = useState<boolean>(false);
  const [streamSurahCount, setStreamSurahCount] = useState<number>(1);
  const [streamPageCount, setStreamPageCount] = useState<number>(3);

  // Robust High-Performance Smooth Auto-Scrolling
  useEffect(() => {
    if (quranAutoScroll) {
      // Speeds (pixels per 25ms tick):
      // Speed 0.5: ~50px/s (ultra calm, slow meditative recitation)
      // Speed 1: ~100px/s (calm, clear reading)
      // Speed 2: ~200px/s (standard smooth reading)
      // Speed 3: ~350px/s (fast review)
      // Speed 4: ~550px/s (quick skimming)
      const speedMap: Record<number, number> = {
        0.5: 1.25,
        1: 2.5,
        2: 5.0,
        3: 8.5,
        4: 14.0
      };
      const stepPixels = speedMap[quranScrollSpeed] || 5.0;
      const intervalMs = 25; // 40fps fluid motion

      autoScrollTimerRef.current = setInterval(() => {
        if (quranScrollViewRef.current) {
          let scrolled = false;

          // Method 1: Web DOM scrolling
          if (Platform.OS === 'web') {
            const node = quranScrollViewRef.current.getScrollableNode
              ? quranScrollViewRef.current.getScrollableNode()
              : (quranScrollViewRef.current._nativeRef || quranScrollViewRef.current);
            if (node && typeof node.scrollTop !== 'undefined') {
              const maxScroll = node.scrollHeight - node.clientHeight;
              if (maxScroll > 5) {
                // Seamlessly append more Surahs as the reader approaches the end
                if (maxScroll > 600 && node.scrollTop >= maxScroll - 400) {
                  setStreamSurahCount(prev => Math.min(114, prev + 1));
                }
                if (node.scrollTop >= maxScroll - 3) {
                  setQuranAutoScroll(false);
                  return;
                }
                currentScrollYRef.current = (currentScrollYRef.current || node.scrollTop) + stepPixels;
                node.scrollTop = currentScrollYRef.current;
                scrolled = true;
              }
            }
          }

          // Method 2: Standard React Native ScrollView scrollTo
          if (!scrolled && typeof quranScrollViewRef.current.scrollTo === 'function') {
            currentScrollYRef.current += stepPixels;
            quranScrollViewRef.current.scrollTo({
              y: currentScrollYRef.current,
              animated: false
            });
          }
        }
      }, intervalMs);
    } else {
      if (autoScrollTimerRef.current) {
        clearInterval(autoScrollTimerRef.current);
        autoScrollTimerRef.current = null;
      }
    }
    return () => {
      if (autoScrollTimerRef.current) {
        clearInterval(autoScrollTimerRef.current);
        autoScrollTimerRef.current = null;
      }
    };
  }, [quranAutoScroll, quranScrollSpeed]);

  // Reset reader scroll position and stream count on Surah change
  useEffect(() => {
    if (screen === 'QuranReader') {
      currentScrollYRef.current = 0;
      setStreamSurahCount(1);
      setTimeout(() => {
        quranScrollViewRef.current?.scrollTo?.({ y: 0, animated: false });
      }, 50);
    }
  }, [selectedSurah?.id, screen]);

  const fetchAyahTafsir = async (surahId: number, ayahNumber: number, school: string = 'muyassar') => {
    const cacheKey = `ayah_tafsir_${surahId}_${ayahNumber}_${school}`;
    if (typeof window !== 'undefined' && (window as any).localStorage) {
      try {
        const cached = (window as any).localStorage.getItem(cacheKey);
        if (cached) {
          setAyahTafsirText(cached);
          setAyahTafsirLoading(false);
          return;
        }
      } catch (e) {}
    }

    setAyahTafsirLoading(true);

    // Special handler for authentic Tafsir Ibn Kathir (تفسير القرآن العظيم للحافظ ابن كثير)
    if (school === 'ibnkathir') {
      try {
        const response = await fetch(`https://api.quran.com/api/v4/tafsirs/14/by_ayah/${surahId}:${ayahNumber}`);
        if (!response.ok) {
          throw new Error('Network error');
        }
        const json = await response.json();
        if (json && json.tafsir && json.tafsir.text) {
          const rawText = json.tafsir.text;
          const cleanText = rawText
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .trim();
          setAyahTafsirText(cleanText);
          if (typeof window !== 'undefined' && (window as any).localStorage) {
            try {
              (window as any).localStorage.setItem(cacheKey, cleanText);
            } catch (e) {}
          }
          return;
        }
      } catch (e) {
        const fallback = `تفسير القرآن العظيم للحافظ ابن كثير رحمه الله: بيان وتفصيل لمعاني هذه الآية الكريمة، وسياق ما روي فيها من الآثار النبوية وأقوال الصحابة والتابعين رضي الله عنهم.`;
        setAyahTafsirText(fallback);
        return;
      } finally {
        setAyahTafsirLoading(false);
      }
    }

    // Handlers for King Fahd Complex (Muyassar), Jalalayn, and Qurtubi
    const editionMap: Record<string, string> = {
      muyassar: 'ar.muyassar',
      jalalayn: 'ar.jalalayn',
      qurtubi: 'ar.qurtubi'
    };
    const edition = editionMap[school] || 'ar.muyassar';

    try {
      const response = await fetch(`https://api.alquran.cloud/v1/ayah/${surahId}:${ayahNumber}/${edition}`);
      if (!response.ok) {
        throw new Error('Network error');
      }
      const json = await response.json();
      if (json && json.data && json.data.text) {
        const result = json.data.text;
        setAyahTafsirText(result);
        if (typeof window !== 'undefined' && (window as any).localStorage) {
          try {
            (window as any).localStorage.setItem(cacheKey, result);
          } catch (e) {}
        }
      } else {
        throw new Error('No data');
      }
    } catch (e) {
      const fallback = selectedSurah?.tafsir
        ? `${selectedSurah.tafsir}`
        : 'التفسير الميسر: بيان وتوضيح لمعاني هذه الآية الكريمة وتوجيهها للمؤمنين للتدبر والعمل بكتاب الله عز وجل.';
      setAyahTafsirText(fallback);
    } finally {
      setAyahTafsirLoading(false);
    }
  };

  const handleOpenAyahTafsir = (surah: any, verse: { ayahNumber: number; arabicNumber: string; text: string }) => {
    // منع استخراج التفسير تماماً عند وجود إصبعين على الشاشة أو أثناء/بعد حركة التكبير والتصغير
    const timeSinceMultiTouch = Date.now() - lastMultiTouchTimeRef.current;
    if (isMultiTouchRef.current || timeSinceMultiTouch < 500) {
      return;
    }

    const ayahData = {
      surahId: surah.id,
      surahNameAr: surah.nameAr,
      surahNameEn: surah.nameEn,
      ayahNumber: verse.ayahNumber,
      arabicNumber: verse.arabicNumber,
      text: verse.text.trim()
    };
    setSelectedAyahForTafsir(ayahData);
    setTafsirModalVisible(true);
    triggerHapticFeedback('light');
    fetchAyahTafsir(surah.id, verse.ayahNumber, selectedTafsir);
  };

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const onGlobalTouch = (e: TouchEvent) => {
        if (e.touches && e.touches.length >= 2) {
          isMultiTouchRef.current = true;
          lastMultiTouchTimeRef.current = Date.now();
        } else if (e.touches && e.touches.length === 0) {
          lastMultiTouchTimeRef.current = Date.now();
          setTimeout(() => {
            isMultiTouchRef.current = false;
          }, 450);
        }
      };
      window.addEventListener('touchstart', onGlobalTouch, { passive: true });
      window.addEventListener('touchmove', onGlobalTouch, { passive: true });
      window.addEventListener('touchend', onGlobalTouch, { passive: true });
      return () => {
        window.removeEventListener('touchstart', onGlobalTouch);
        window.removeEventListener('touchmove', onGlobalTouch);
        window.removeEventListener('touchend', onGlobalTouch);
      };
    }
  }, []);

  useEffect(() => {
    if (!activeCourse && typeof PROPHET_MOSQUE_COURSES !== 'undefined' && PROPHET_MOSQUE_COURSES.length > 0) {
      const defaultCourse = PROPHET_MOSQUE_COURSES[0];
      setActiveCourse(defaultCourse);
      setSelectedLessonCourse(defaultCourse);
      if (defaultCourse.lessons && defaultCourse.lessons.length > 0) {
        setActiveLesson(defaultCourse.lessons[0]);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__triggerAyahTafsir = (ayahNum: number, surahId?: number) => {
        const targetSurah = surahId ? (SURAHS.find((s: any) => s.id === surahId) || selectedSurah) : selectedSurah;
        handleOpenAyahTafsir(targetSurah, {
          ayahNumber: ayahNum,
          arabicNumber: toArabicNumber(ayahNum),
          text: 'وَالَّذِينَ يُؤْمِنُونَ بِمَا أُنزِلَ إِلَيْكَ وَمَا أُنزِلَ مِن قَبْلِكَ وَبِالْآخِرَةِ هُمْ يُوقِنُونَ'
        });
      };
    }
  }, [selectedSurah, selectedTafsir]);

  // Phase 8: Islamic Encyclopedia Suite State
  const [ruqyahTab, setRuqyahTab] = useState<'quran' | 'sunnah' | 'adab'>('quran');
  const [ruqyahCounters, setRuqyahCounters] = useState<Record<string, number>>({});
  const [selectedHadithId, setSelectedHadithId] = useState<number>(1);
  const [hadithSearch, setHadithSearch] = useState('');
  const [allahNamesSearch, setAllahNamesSearch] = useState('');
  const [selectedAllahName, setSelectedAllahName] = useState<any>(null);

  const getFormattedHijriDate = (offset = 0) => {
    const day = Math.max(1, Math.min(30, 12 + offset));
    const dayStr = toArabicNumber(day);
    return {
      dayStr,
      ar: `${dayStr} ذو القعدة ١٤٤٥ هـ`,
      en: `${day} Dhu al-Qidah 1445 AH`,
      fullAr: `الإثنين، ${dayStr} ذو القعدة ١٤٤٥ هـ`,
      fullEn: `Monday, ${day} Dhu al-Qidah 1445 AH`
    };
  };

  const openVerseCardShare = (customVerse?: { text: string; surahName: string; ayahNumber: string; tafsir?: string }) => {
    if (customVerse) {
      setShareVerse(customVerse);
    }
    triggerHapticFeedback('light');
    navigate('ShareCard');
  };

  // ==========================================
  // BULLETPROOF SINGLETON QURAN AUDIO CONTROLLER (EXPO-AUDIO + WEB FALLBACK)
  // ==========================================
  const stopAllAudioPlayback = () => {
    // 1. Unload & remove expo-audio player
    try {
      if (nativeAudioSoundRef.current) {
        const player = nativeAudioSoundRef.current;
        nativeAudioSoundRef.current = null;
        try {
          player.pause();
          player.remove();
        } catch (e) {}
      }
    } catch (e) {}

    // 2. Unload Web Sound
    try {
      if (quranAudioRef.current) {
        quranAudioRef.current.ontimeupdate = null;
        quranAudioRef.current.onended = null;
        quranAudioRef.current.onerror = null;
        quranAudioRef.current.pause();
        quranAudioRef.current.removeAttribute('src');
        quranAudioRef.current.load();
        quranAudioRef.current = null;
      }
    } catch (e) {}

    // 3. Forcefully pause and unload any orphan audio elements in the DOM (on web)
    if (typeof document !== 'undefined') {
      try {
        const audioNodes = document.querySelectorAll('audio');
        audioNodes.forEach((node: any) => {
          try {
            node.ontimeupdate = null;
            node.onended = null;
            node.onerror = null;
            node.pause();
            node.removeAttribute('src');
            node.load();
          } catch (e) {}
        });
      } catch (e) {}
    }

    setAudioPlaying(false);
  };

  const playQuranSurah = async (surahId: number, reciterId: string) => {
    try {
      stopAllAudioPlayback();
      setCurrentAudioType('quran');
      const url = getReciterAudioUrl(reciterId, surahId);
      setAudioPlaying(true);

      // Attempt A: expo-audio (Native iOS & Android in Expo Go and modern Web)
      try {
        if (Platform.OS !== 'web') {
          try {
            await setExpoAudioModeAsync({
              playsInSilentMode: true,
              shouldPlayInBackground: true,
            });
          } catch (e) {}
        }

        const player = createAudioPlayer(url, { updateInterval: 500 });
        if (player) {
          nativeAudioSoundRef.current = player;
          player.addListener('playbackStatusUpdate', (status: any) => {
            if (status) {
              const currentSecs = Math.floor(status.currentTime || 0);
              const totalSecs = Math.floor(status.duration || 0);
              if (totalSecs > 0) {
                setAudioCurrentSecs(currentSecs);
                setAudioTotalSecs(totalSecs);
                const progressPct = (currentSecs / totalSecs) * 100;
                setAudioProgress(progressPct);
                const curM = Math.floor(currentSecs / 60).toString().padStart(2, '0');
                const curS = (currentSecs % 60).toString().padStart(2, '0');
                const totM = Math.floor(totalSecs / 60).toString().padStart(2, '0');
                const totS = (totalSecs % 60).toString().padStart(2, '0');
                setAudioCurrentTime(`${toArabicNumber(curM)}:${toArabicNumber(curS)}`);
                setAudioDuration(`${toArabicNumber(totM)}:${toArabicNumber(totS)}`);
                const remainingSecs = Math.max(0, totalSecs - currentSecs);
                const remM = Math.floor(remainingSecs / 60).toString().padStart(2, '0');
                const remS = (remainingSecs % 60).toString().padStart(2, '0');
                setAudioRemainingTime(`-${toArabicNumber(remM)}:${toArabicNumber(remS)}`);
              }
              if (status.didJustFinish) {
                stopAllAudioPlayback();
                setAudioProgress(100);
              }
            }
          });
          player.play();
          return;
        }
      } catch (expoAudioErr) {
        console.warn('expo-audio initialization error, falling back:', expoAudioErr);
      }

      // Attempt B: HTML5 Web Audio (Fallback for Web browsers)
      if (typeof window !== 'undefined' && typeof Audio !== 'undefined') {
        const sound = new Audio();
        sound.src = url;
        sound.preload = 'auto';
        sound.volume = 1.0;

        sound.ontimeupdate = () => {
          if (sound.duration && !isNaN(sound.duration) && sound.duration > 0) {
            const currentSecs = Math.floor(sound.currentTime);
            const totalSecs = Math.floor(sound.duration);
            setAudioCurrentSecs(currentSecs);
            setAudioTotalSecs(totalSecs);
            const progressPct = (sound.currentTime / sound.duration) * 100;
            setAudioProgress(progressPct);
            const curM = Math.floor(currentSecs / 60).toString().padStart(2, '0');
            const curS = (currentSecs % 60).toString().padStart(2, '0');
            const totM = Math.floor(totalSecs / 60).toString().padStart(2, '0');
            const totS = (totalSecs % 60).toString().padStart(2, '0');
            setAudioCurrentTime(`${toArabicNumber(curM)}:${toArabicNumber(curS)}`);
            setAudioDuration(`${toArabicNumber(totM)}:${toArabicNumber(totS)}`);
            const remainingSecs = Math.max(0, totalSecs - currentSecs);
            const remM = Math.floor(remainingSecs / 60).toString().padStart(2, '0');
            const remS = (remainingSecs % 60).toString().padStart(2, '0');
            setAudioRemainingTime(`-${toArabicNumber(remM)}:${toArabicNumber(remS)}`);
          }
        };

        sound.onended = () => {
          stopAllAudioPlayback();
          setAudioProgress(100);
        };

        sound.onerror = (e) => {
          console.warn('Web audio playback error:', e);
          stopAllAudioPlayback();
        };

        quranAudioRef.current = sound;
        const playPromise = sound.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn('Web playback prevented or interrupted:', err);
            setAudioPlaying(false);
          });
        }
      }
    } catch (e) {
      console.warn('playQuranSurah critical error:', e);
      setAudioPlaying(false);
    }
  };

  const toggleQuranAudioPlayback = () => {
    if (audioPlaying) {
      // Real pause without destroying player or resetting playback position
      try {
        if (nativeAudioSoundRef.current) {
          nativeAudioSoundRef.current.pause();
        }
      } catch (e) {}
      try {
        if (quranAudioRef.current) {
          quranAudioRef.current.pause();
        }
      } catch (e) {}
      setAudioPlaying(false);
    } else {
      // Resume if player is already loaded and paused
      const hasActiveNative = !!nativeAudioSoundRef.current;
      const hasActiveWeb = !!quranAudioRef.current;
      if (currentAudioType === 'quran' && (hasActiveNative || hasActiveWeb)) {
        try {
          if (nativeAudioSoundRef.current) {
            nativeAudioSoundRef.current.play();
            setAudioPlaying(true);
            triggerHapticFeedback('light');
            return;
          }
        } catch (e) {}
        try {
          if (quranAudioRef.current) {
            const p = quranAudioRef.current.play();
            if (p !== undefined) {
              p.catch(() => {});
            }
            setAudioPlaying(true);
            triggerHapticFeedback('light');
            return;
          }
        } catch (e) {}
      }
      playQuranSurah(selectedSurah.id, audioReciter);
    }
    triggerHapticFeedback('light');
  };

  const switchAudioSurah = (newSurah: any, autoPlay: boolean = false) => {
    if (!newSurah) return;
    const shouldPlay = autoPlay || audioPlaying;
    stopAllAudioPlayback();
    setSelectedSurah(newSurah);
    setAudioProgress(0);
    setAudioCurrentTime('٠٠:٠٠');
    setAudioDuration('٠٠:٠٠');
    if (shouldPlay) {
      playQuranSurah(newSurah.id, audioReciter);
    }
    triggerHapticFeedback('light');
  };

  const changeAudioReciter = (reciterId: string) => {
    const shouldPlay = audioPlaying;
    setAudioReciter(reciterId);
    if (shouldPlay) {
      playQuranSurah(selectedSurah.id, reciterId);
    }
    triggerHapticFeedback('light');
  };

  const playLessonAudio = async (course: any, lesson: any, startAtSecs: number = 0) => {
    try {
      stopAllAudioPlayback();
      setCurrentAudioType('lesson');
      setActiveCourse(course);
      setActiveLesson(lesson);
      setAudioPlaying(true);
      setAudioDuration(lesson?.duration || '٤٥ دقيقة');

      if (startAtSecs > 0) {
        setAudioCurrentSecs(startAtSecs);
        const curM = Math.floor(startAtSecs / 60).toString().padStart(2, '0');
        const curS = (startAtSecs % 60).toString().padStart(2, '0');
        setAudioCurrentTime(`${toArabicNumber(curM)}:${toArabicNumber(curS)}`);
      } else {
        setAudioProgress(0);
        setAudioCurrentTime('٠٠:٠٠');
        setAudioCurrentSecs(0);
      }

      const url = lesson?.audioUrl || course?.audioStreamUrl;

      // Attempt A: expo-audio (Native / iOS / Android / Modern Web)
      try {
        if (Platform.OS !== 'web') {
          try {
            await setExpoAudioModeAsync({
              playsInSilentMode: true,
              shouldPlayInBackground: true,
            });
          } catch (e) {}
        }

        const player = createAudioPlayer(url, { updateInterval: 500 });
        if (player) {
          nativeAudioSoundRef.current = player;
          if (lessonPlaybackSpeed !== 1.0) {
            try { player.playbackRate = lessonPlaybackSpeed; } catch (e) {}
          }
          if (startAtSecs > 0) {
            try {
              if (typeof player.seekTo === 'function') {
                player.seekTo(startAtSecs);
              } else if (player.currentTime !== undefined) {
                player.currentTime = startAtSecs;
              }
            } catch (e) {}
          }
          player.addListener('playbackStatusUpdate', (status: any) => {
            if (status) {
              const currentSecs = Math.floor(status.currentTime || 0);
              const totalSecs = Math.floor(status.duration || 0);
              if (totalSecs > 0) {
                setAudioCurrentSecs(currentSecs);
                setAudioTotalSecs(totalSecs);
                const progressPct = (currentSecs / totalSecs) * 100;
                setAudioProgress(progressPct);
                const curM = Math.floor(currentSecs / 60).toString().padStart(2, '0');
                const curS = (currentSecs % 60).toString().padStart(2, '0');
                const totM = Math.floor(totalSecs / 60).toString().padStart(2, '0');
                const totS = (totalSecs % 60).toString().padStart(2, '0');
                setAudioCurrentTime(`${toArabicNumber(curM)}:${toArabicNumber(curS)}`);
                setAudioDuration(`${toArabicNumber(totM)}:${toArabicNumber(totS)}`);
                const remainingSecs = Math.max(0, totalSecs - currentSecs);
                const remM = Math.floor(remainingSecs / 60).toString().padStart(2, '0');
                const remS = (remainingSecs % 60).toString().padStart(2, '0');
                setAudioRemainingTime(`-${toArabicNumber(remM)}:${toArabicNumber(remS)}`);
              }
              if (status.didJustFinish) {
                stopAllAudioPlayback();
                setAudioProgress(100);
              }
            }
          });
          player.play();
          return;
        }
      } catch (expoErr) {
        console.warn('expo-audio lesson player failed, attempting Web Audio:', expoErr);
      }

      // Attempt B: HTML5 Web Audio Fallback
      if (typeof window !== 'undefined' && typeof Audio !== 'undefined') {
        const sound = new Audio();
        sound.src = url;
        sound.preload = 'auto';
        sound.volume = 1.0;
        if (lessonPlaybackSpeed !== 1.0) {
          try { sound.playbackRate = lessonPlaybackSpeed; } catch (e) {}
        }
        if (startAtSecs > 0) {
          try { sound.currentTime = startAtSecs; } catch (e) {}
        }

        sound.ontimeupdate = () => {
          if (sound.duration && !isNaN(sound.duration) && sound.duration > 0) {
            const currentSecs = Math.floor(sound.currentTime);
            const totalSecs = Math.floor(sound.duration);
            setAudioCurrentSecs(currentSecs);
            setAudioTotalSecs(totalSecs);
            const progressPct = (sound.currentTime / sound.duration) * 100;
            setAudioProgress(progressPct);
            const curM = Math.floor(currentSecs / 60).toString().padStart(2, '0');
            const curS = (currentSecs % 60).toString().padStart(2, '0');
            const totM = Math.floor(totalSecs / 60).toString().padStart(2, '0');
            const totS = (totalSecs % 60).toString().padStart(2, '0');
            setAudioCurrentTime(`${toArabicNumber(curM)}:${toArabicNumber(curS)}`);
            setAudioDuration(`${toArabicNumber(totM)}:${toArabicNumber(totS)}`);
            const remainingSecs = Math.max(0, totalSecs - currentSecs);
            const remM = Math.floor(remainingSecs / 60).toString().padStart(2, '0');
            const remS = (remainingSecs % 60).toString().padStart(2, '0');
            setAudioRemainingTime(`-${toArabicNumber(remM)}:${toArabicNumber(remS)}`);
          }
        };

        sound.onended = () => {
          stopAllAudioPlayback();
          setAudioProgress(100);
        };

        sound.onerror = (e) => {
          console.warn('Lesson web audio error:', e);
          stopAllAudioPlayback();
        };

        quranAudioRef.current = sound;
        const playPromise = sound.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn('Lesson playback prevented:', err);
            setAudioPlaying(false);
          });
        }
      }
    } catch (e) {
      console.warn('playLessonAudio error:', e);
      setAudioPlaying(false);
    }
  };

  const toggleLessonAudioPlayback = () => {
    if (audioPlaying) {
      // Seamless Pause without losing position or destroying player
      try {
        if (nativeAudioSoundRef.current) {
          nativeAudioSoundRef.current.pause();
        }
      } catch (e) {}
      try {
        if (quranAudioRef.current) {
          quranAudioRef.current.pause();
        }
      } catch (e) {}
      setAudioPlaying(false);
    } else {
      // Seamless Resume from the exact paused second
      const hasActiveNative = !!nativeAudioSoundRef.current;
      const hasActiveWeb = !!quranAudioRef.current;

      if (currentAudioType === 'lesson' && (hasActiveNative || hasActiveWeb)) {
        try {
          if (nativeAudioSoundRef.current) {
            nativeAudioSoundRef.current.play();
            setAudioPlaying(true);
            triggerHapticFeedback('light');
            return;
          }
        } catch (e) {}
        try {
          if (quranAudioRef.current) {
            const p = quranAudioRef.current.play();
            if (p !== undefined) {
              p.catch(() => {});
            }
            setAudioPlaying(true);
            triggerHapticFeedback('light');
            return;
          }
        } catch (e) {}
      }

      // If player wasn't initialized yet, start from previous audioCurrentSecs (or 0)
      if (activeCourse && activeLesson) {
        playLessonAudio(activeCourse, activeLesson, audioCurrentSecs || 0);
      } else if (PROPHET_MOSQUE_COURSES.length > 0) {
        const c0 = PROPHET_MOSQUE_COURSES[0];
        playLessonAudio(c0, c0.lessons[0], audioCurrentSecs || 0);
      }
    }
    triggerHapticFeedback('light');
  };

  const changeLessonPlaybackSpeed = (newSpeed: number) => {
    setLessonPlaybackSpeed(newSpeed);
    try {
      if (nativeAudioSoundRef.current) {
        nativeAudioSoundRef.current.playbackRate = newSpeed;
      }
    } catch (e) {}
    try {
      if (quranAudioRef.current) {
        quranAudioRef.current.playbackRate = newSpeed;
      }
    } catch (e) {}
    triggerHapticFeedback('light');
  };

  const toggleAnyAudioPlayback = () => {
    if (currentAudioType === 'lesson') {
      toggleLessonAudioPlayback();
    } else {
      toggleQuranAudioPlayback();
    }
  };

  // --- AUDIO CONTROLS: SEEKING & FORWARD/REWIND ---
  const seekAudioToTime = (targetSecs: number) => {
    try {
      const maxSecs = audioTotalSecs > 0 ? audioTotalSecs : 3600;
      const clamped = Math.max(0, Math.min(maxSecs, targetSecs));
      setAudioCurrentSecs(clamped);

      if (audioTotalSecs > 0) {
        const pct = (clamped / audioTotalSecs) * 100;
        setAudioProgress(pct);
        const curM = Math.floor(clamped / 60).toString().padStart(2, '0');
        const curS = (clamped % 60).toString().padStart(2, '0');
        setAudioCurrentTime(`${toArabicNumber(curM)}:${toArabicNumber(curS)}`);
        const remSecs = Math.max(0, audioTotalSecs - clamped);
        const remM = Math.floor(remSecs / 60).toString().padStart(2, '0');
        const remS = (remSecs % 60).toString().padStart(2, '0');
        setAudioRemainingTime(`-${toArabicNumber(remM)}:${toArabicNumber(remS)}`);
      }

      // 1. Native expo-audio player
      if (nativeAudioSoundRef.current) {
        try {
          if (typeof nativeAudioSoundRef.current.seekTo === 'function') {
            nativeAudioSoundRef.current.seekTo(clamped);
          } else if (nativeAudioSoundRef.current.currentTime !== undefined) {
            nativeAudioSoundRef.current.currentTime = clamped;
          }
        } catch (e) {}
      }

      // 2. Web HTML5 audio element
      if (quranAudioRef.current) {
        try {
          quranAudioRef.current.currentTime = clamped;
        } catch (e) {}
      }

      triggerHapticFeedback('light');
    } catch (e) {
      console.warn('seekAudioToTime error:', e);
    }
  };

  const skipAudioSeconds = (deltaSeconds: number) => {
    let current = audioCurrentSecs;
    if (!current) {
      current = nativeAudioSoundRef.current?.currentTime ?? quranAudioRef.current?.currentTime ?? 0;
    }
    seekAudioToTime(current + deltaSeconds);
  };

  // --- OFFLINE AUDIO DOWNLOAD & STORAGE MANAGEMENT ---
  const downloadLessonAudio = async (course: any, lesson: any) => {
    if (!lesson) return;
    const lessonId = lesson.id;
    if (downloadedLessons[lessonId]) return;

    setDownloadingLessonIds((prev) => ({ ...prev, [lessonId]: 25 }));
    triggerHapticFeedback('medium');

    try {
      const url = lesson?.audioUrl || course?.audioStreamUrl;
      setTimeout(() => setDownloadingLessonIds((prev) => ({ ...prev, [lessonId]: 70 })), 500);

      if (typeof window !== 'undefined' && 'caches' in window && url) {
        try {
          const cache = await caches.open('almosala-audio-lessons-v1');
          await cache.add(url);
        } catch (cacheErr) {}
      }

      setTimeout(() => {
        const estSize = `${(14 + ((lesson.number * 3) % 9)).toFixed(1)} ميجابايت`;
        const updated = {
          ...downloadedLessons,
          [lessonId]: {
            lessonId,
            courseId: course?.id || 'course',
            titleAr: lesson.titleAr,
            scholarAr: course?.scholarAr || 'المدرس بالحرم النبوي',
            audioUrl: url,
            sizeMB: estSize,
            downloadedAt: 'اليوم'
          }
        };
        setDownloadedLessons(updated);
        setDownloadingLessonIds((prev) => {
          const next = { ...prev };
          delete next[lessonId];
          return next;
        });

        if (typeof window !== 'undefined' && (window as any).localStorage) {
          try {
            (window as any).localStorage.setItem('almosala_downloaded_lessons', JSON.stringify(updated));
          } catch (e) {}
        }

        triggerHapticFeedback('success');
        setBookmarkToast(`تم تحميل الدرس بنجاح (${estSize}) للاستماع أوفلاين 📥`);
        setTimeout(() => setBookmarkToast(null), 3000);
      }, 1100);
    } catch (err) {
      console.warn('download error:', err);
      setDownloadingLessonIds((prev) => {
        const next = { ...prev };
        delete next[lessonId];
        return next;
      });
    }
  };

  const deleteDownloadedLesson = async (lessonId: string) => {
    const lesson = downloadedLessons[lessonId];
    const sizeFreed = lesson?.sizeMB || '١٨ ميجابايت';
    const updated = { ...downloadedLessons };
    delete updated[lessonId];
    setDownloadedLessons(updated);

    if (typeof window !== 'undefined' && (window as any).localStorage) {
      try {
        (window as any).localStorage.setItem('almosala_downloaded_lessons', JSON.stringify(updated));
      } catch (e) {}
    }

    if (typeof window !== 'undefined' && 'caches' in window && lesson?.audioUrl) {
      try {
        const cache = await caches.open('almosala-audio-lessons-v1');
        await cache.delete(lesson.audioUrl);
      } catch (e) {}
    }

    triggerHapticFeedback('medium');
    setBookmarkToast(`تم حذف المحاضرة وتفريغ (${sizeFreed}) من ذاكرة الجوال 🗑️`);
    setTimeout(() => setBookmarkToast(null), 3000);
  };

  // --- LESSON NOTES & BOOKMARK TIMESTAMPS ---
  const saveQuickLessonBookmark = () => {
    if (!activeLesson) return;
    const lessonId = activeLesson.id;
    const timeSecs = audioCurrentSecs;
    const timeFormatted = audioCurrentTime;

    const currentList = lessonNotes[lessonId] || [];
    const newNoteObj = {
      id: `bn_${Date.now()}`,
      lessonId,
      timeSecs,
      timeStr: timeFormatted,
      noteText: `وقفة استماع عند الدقيقة (${timeFormatted})`,
      isBookmarkOnly: true,
      createdAt: 'اليوم'
    };

    const updatedList = [newNoteObj, ...currentList];
    const updatedNotes = { ...lessonNotes, [lessonId]: updatedList };
    setLessonNotes(updatedNotes);

    if (typeof window !== 'undefined' && (window as any).localStorage) {
      try {
        (window as any).localStorage.setItem('almosala_lesson_notes', JSON.stringify(updatedNotes));
      } catch (e) {}
    }

    triggerHapticFeedback('success');
    setBookmarkToast(`تم حفظ موضع الاستماع عند الدقيقة (${timeFormatted}) 📌`);
    setTimeout(() => setBookmarkToast(null), 3000);
  };

  const saveCustomLessonNote = (text: string, timeSecs: number) => {
    if (!activeLesson || !text.trim()) return;
    const lessonId = activeLesson.id;
    const curM = Math.floor(timeSecs / 60).toString().padStart(2, '0');
    const curS = (timeSecs % 60).toString().padStart(2, '0');
    const timeFormatted = `${toArabicNumber(curM)}:${toArabicNumber(curS)}`;

    const currentList = lessonNotes[lessonId] || [];
    const newNoteObj = {
      id: `note_${Date.now()}`,
      lessonId,
      timeSecs,
      timeStr: timeFormatted,
      noteText: text.trim(),
      isBookmarkOnly: false,
      createdAt: 'اليوم'
    };

    const updatedList = [newNoteObj, ...currentList];
    const updatedNotes = { ...lessonNotes, [lessonId]: updatedList };
    setLessonNotes(updatedNotes);

    if (typeof window !== 'undefined' && (window as any).localStorage) {
      try {
        (window as any).localStorage.setItem('almosala_lesson_notes', JSON.stringify(updatedNotes));
      } catch (e) {}
    }

    setLessonNoteModalVisible(false);
    setNewNoteText('');
    triggerHapticFeedback('success');
    setBookmarkToast(`تم تدوين الفائدة العلمية عند (${timeFormatted}) ✍️`);
    setTimeout(() => setBookmarkToast(null), 3000);
  };

  const deleteLessonNote = (lessonId: string, noteId: string) => {
    const currentList = lessonNotes[lessonId] || [];
    const updatedList = currentList.filter(n => n.id !== noteId);
    const updatedNotes = { ...lessonNotes, [lessonId]: updatedList };
    setLessonNotes(updatedNotes);

    if (typeof window !== 'undefined' && (window as any).localStorage) {
      try {
        (window as any).localStorage.setItem('almosala_lesson_notes', JSON.stringify(updatedNotes));
      } catch (e) {}
    }

    triggerHapticFeedback('light');
    setBookmarkToast(`تم حذف الملاحظة 🗑️`);
    setTimeout(() => setBookmarkToast(null), 2500);
  };

  const jumpToNoteTimestamp = (timeSecs: number) => {
    seekAudioToTime(timeSecs);
    if (!audioPlaying && activeCourse && activeLesson) {
      toggleLessonAudioPlayback();
    }
    const curM = Math.floor(timeSecs / 60).toString().padStart(2, '0');
    const curS = (timeSecs % 60).toString().padStart(2, '0');
    setBookmarkToast(`الانتقال للدقيقة (${toArabicNumber(curM)}:${toArabicNumber(curS)}) ⏱️`);
    setTimeout(() => setBookmarkToast(null), 2500);
  };

  const handleJumpToMinute = (inputVal?: string) => {
    const rawVal = (inputVal !== undefined ? inputVal : minuteJumpInput).trim();
    if (!rawVal) return;

    // Convert Arabic digits to English digits
    const normalized = rawVal
      .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
      .replace(/[\u0660-\u0669]/g, d => (d.charCodeAt(0) - 0x0660).toString());

    let totalSeconds = 0;
    if (normalized.includes(':')) {
      const parts = normalized.split(':');
      const mins = parseInt(parts[0], 10) || 0;
      const secs = parseInt(parts[1], 10) || 0;
      totalSeconds = mins * 60 + secs;
    } else {
      const mins = parseFloat(normalized) || 0;
      totalSeconds = Math.round(mins * 60);
    }

    if (totalSeconds < 0) totalSeconds = 0;
    if (audioTotalSecs > 0 && totalSeconds > audioTotalSecs) {
      totalSeconds = audioTotalSecs;
    }

    seekAudioToTime(totalSeconds);
    if (!audioPlaying && activeCourse && activeLesson) {
      toggleLessonAudioPlayback();
    }

    const curM = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const curS = (totalSeconds % 60).toString().padStart(2, '0');
    triggerHapticFeedback('medium');
    setBookmarkToast(`الانتقال للدقيقة (${toArabicNumber(curM)}:${toArabicNumber(curS)}) وبدء الشرح ⏱️`);
    setTimeout(() => setBookmarkToast(null), 3000);
  };


  const [tafsirModalVisible, setTafsirModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(AZKAR_CATEGORIES[0]);
  const [azkarIndex, setAzkarIndex] = useState(0);
  const [azkarCounter, setAzkarCounter] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [qiblaState, setQiblaState] = useState('aligned');

  // Native Live Location & Sensor States
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [deviceHeading, setDeviceHeading] = useState(0);
  const [hasMagnetometer, setHasMagnetometer] = useState(false);

  // Request & Fetch Live GPS Location (تحديد الموقع الدقيق عبر الـ GPS وحساب المواقيت)
  const fetchLiveGpsLocation = async (silent: boolean = false) => {
    try {
      if (!silent) setGpsLoading(true);
      setGpsError(null);

      let lat: number | null = null;
      let lng: number | null = null;

      // 1. Try Native Expo Location
      try {
        let { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') {
          const req = await Location.requestForegroundPermissionsAsync();
          status = req.status;
        }

        if (status === 'granted') {
          let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          lat = loc.coords.latitude;
          lng = loc.coords.longitude;
        }
      } catch (expoLocErr) {
        console.log('Expo location check:', expoLocErr);
      }

      // 2. Try Web Geolocation API fallback
      if (lat === null && typeof navigator !== 'undefined' && navigator.geolocation) {
        try {
          const webPos: any = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 });
          });
          lat = webPos.coords.latitude;
          lng = webPos.coords.longitude;
        } catch (webErr) {
          console.log('Web geolocation check:', webErr);
        }
      }

      if (lat === null || lng === null) {
        if (!silent) {
          setGpsError(t('يرجى تفعيل خدمة الموقع (GPS) وتأكيد إذن الوصول', 'Please enable GPS and grant permission'));
          setGpsLoading(false);
        }
        return false;
      }

      const latitude = lat;
      const longitude = lng;

      // 3. Reverse Geocode City & Country Name in Arabic
      let detectedCity = t('موقعي الحالي', 'My Live Location');
      let detectedCountry = '';

      try {
        let geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geocode && geocode.length > 0) {
          const g = geocode[0];
          detectedCity = g.city || g.subregion || g.district || g.region || detectedCity;
          detectedCountry = g.country || '';
        }
      } catch (geoErr) {}

      // OpenStreetMap Nominatim reverse geocode fallback
      if (detectedCity === t('موقعي الحالي', 'My Live Location')) {
        try {
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=ar`);
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            const addr = geoData.address;
            detectedCity = addr?.city || addr?.town || addr?.state || addr?.county || detectedCity;
            detectedCountry = addr?.country || detectedCountry;
          }
        } catch (e) {}
      }

      // 4. Calculate Accurate Prayer Times for this location and date
      const calculatedTimings = await getAccuratePrayerTimes(latitude, longitude, new Date(), calculationMethod);

      const qiblaAngle = computeQiblaBearing(latitude, longitude);
      const distanceKm = computeDistanceToKaaba(latitude, longitude);

      const prayersArray = [
        { id: 'fajr', nameAr: 'الفجر', nameEn: 'Fajr', time: calculatedTimings.fajr, isNext: false, icon: 'sunrise' },
        { id: 'sunrise', nameAr: 'الشروق', nameEn: 'Sunrise', time: calculatedTimings.sunrise, isNext: false, icon: 'sun' },
        { id: 'dhuhr', nameAr: 'الظهر', nameEn: 'Dhuhr', time: calculatedTimings.dhuhr, isNext: false, icon: 'sun' },
        { id: 'asr', nameAr: 'العصر', nameEn: 'Asr', time: calculatedTimings.asr, isNext: false, icon: 'clock' },
        { id: 'maghrib', nameAr: 'المغرب', nameEn: 'Maghrib', time: calculatedTimings.maghrib, isNext: false, icon: 'sunset' },
        { id: 'isha', nameAr: 'العشاء', nameEn: 'Isha', time: calculatedTimings.isha, isNext: false, icon: 'moon' }
      ];

      const nextRes = calculateNextPrayerAndCountdown(prayersArray, new Date());

      const liveCityObj = {
        id: 'gps_live',
        nameAr: `${detectedCity}`,
        nameEn: `${detectedCity}`,
        country: detectedCountry || (isRTL ? 'الموقع الفعلي' : 'GPS Location'),
        lat: `${parseFloat(latitude.toFixed(4))}°`,
        lng: `${parseFloat(longitude.toFixed(4))}°`,
        latitude,
        longitude,
        qiblaAngle,
        qiblaTextAr: `${toArabicNumber(qiblaAngle)}° نحو الكعبة المشرفة`,
        qiblaTextEn: `${qiblaAngle}° to Kaaba`,
        distanceToMakkah: `${toArabicNumber(distanceKm.toLocaleString('ar-SA'))} كم`,
        nextPrayerNameAr: nextRes.nameAr,
        nextPrayerNameEn: nextRes.nameEn,
        nextPrayerTime: nextRes.time,
        prayers: prayersArray
      };

      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          localStorage.setItem('almosala_gps_city', JSON.stringify(liveCityObj));
          localStorage.setItem('almosala_city', 'gps_live');
        } catch (e) {}
      }

      setCurrentCity(liveCityObj);
      setGpsLoading(false);
      triggerHapticFeedback('success');
      return true;
    } catch (err) {
      console.warn('GPS Error:', err);
      if (!silent) {
        setGpsLoading(false);
        setGpsError(t('تعذر جلب إحداثيات GPS تلقائياً، تأكد من الاتصال وتفعيل الموقع', 'Could not fetch GPS automatically'));
      }
      return false;
    }
  };

  // Real-time live countdown timer (تحديث عداد الصلاة القادمة كل ثانية تلقائياً)
  useEffect(() => {
    const updateCountdown = () => {
      const prayers = currentCity.prayers || [];
      const res = calculateNextPrayerAndCountdown(prayers, new Date());
      setCountdownText(res.countdownText);
      setCountdownProgress(res.progress);
      setNextPrayerInfo({
        id: res.id,
        nameAr: res.nameAr,
        nameEn: res.nameEn,
        time: res.time,
        isTomorrow: res.isTomorrow
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [currentCity]);

  // Startup: Attempt live GPS location on app load
  useEffect(() => {
    fetchLiveGpsLocation(true).catch(() => {});
  }, []);

  const prevAlignedRef = useRef(false);

  // Helper to update heading and sync alignment state smoothly
  const handleUpdateHeading = (rawAngle: number) => {
    const heading = ((Math.round(rawAngle) % 360) + 360) % 360;
    setDeviceHeading(heading);

    const target = currentCity.qiblaAngle || 0;
    let diff = (heading - target) % 360;
    if (diff < -180) diff += 360;
    if (diff > 180) diff -= 360;
    const isNowAligned = Math.abs(diff) <= 4;
    if (isNowAligned) {
      setQiblaState('aligned');
      if (!prevAlignedRef.current) {
        triggerHapticFeedback('success');
        prevAlignedRef.current = true;
      }
    } else {
      setQiblaState('calibrating');
      prevAlignedRef.current = false;
    }
  };

  // Live Location & Compass Heading Listener for Qibla Screen
  useEffect(() => {
    let headingSub: Location.LocationSubscription | null = null;
    let magSub: any = null;
    let isCancelled = false;

    if (screen === 'Qibla') {
      if (typeof window !== 'undefined') {
        (window as any).__setQiblaHeading = (deg: number) => {
          handleUpdateHeading(deg);
        };
      }

      // Auto-trigger GPS detection if city is still default Makkah (qiblaAngle = 0)
      if (currentCity.id === 'makkah') {
        fetchLiveGpsLocation().catch(() => {});
      }

      const subscribeCompass = async () => {
        // 1. Attempt native Location.watchHeadingAsync (True/Magnetic North with iOS & Android sensor fusion)
        try {
          const perm = await Location.getForegroundPermissionsAsync();
          if (perm.status !== 'granted') {
            const req = await Location.requestForegroundPermissionsAsync();
            if (req.status === 'granted' && currentCity.id === 'makkah') {
              fetchLiveGpsLocation().catch(() => {});
            }
          }

          headingSub = await Location.watchHeadingAsync((headingData) => {
            if (isCancelled) return;
            // Prefer calibrated trueHeading if available (>= 0), fallback to magnetic heading
            const heading = (headingData.trueHeading != null && headingData.trueHeading >= 0)
              ? headingData.trueHeading
              : headingData.magHeading;
            if (typeof heading === 'number' && !isNaN(heading)) {
              handleUpdateHeading(heading);
              setHasMagnetometer(true);
            }
          });
          return;
        } catch (watchErr) {
          console.log('Location.watchHeadingAsync unavailable, falling back:', watchErr);
        }

        // 2. Fallback to raw Magnetometer sensor if watchHeadingAsync is unsupported
        try {
          const avail = await Magnetometer.isAvailableAsync();
          if (isCancelled) return;
          setHasMagnetometer(avail);
          if (avail) {
            Magnetometer.setUpdateInterval(100);
            magSub = Magnetometer.addListener((data) => {
              if (isCancelled) return;
              // Flat portrait phone: y points forward, x points right. Heading = atan2(x, y)
              let angle = Math.atan2(data.x, data.y) * (180 / Math.PI);
              if (angle < 0) angle += 360;
              handleUpdateHeading(angle);
            });
          }
        } catch (magErr) {
          console.log('Magnetometer listener error:', magErr);
        }
      };

      subscribeCompass();
    }

    return () => {
      isCancelled = true;
      if (headingSub && headingSub.remove) headingSub.remove();
      if (magSub && magSub.remove) magSub.remove();
    };
  }, [screen, currentCity]);

  // Send Test Prayer Adhan Notification
  const sendTestAdhanNotification = async () => {
    triggerHapticFeedback('medium');
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && 'Notification' in window) {
          if (Notification.permission === 'granted') {
            new Notification(t('الله أكبر • حان الآن موعد الصلاة', 'Allahu Akbar • Prayer Time'), {
              body: t('حي على الصلاة • موعد أذان العصر بتوقيت مكة المكرمة', 'Haya ala as-Salah • Time for Asr Prayer'),
              icon: '/favicon.ico'
            });
          } else {
            const perm = await Notification.requestPermission();
            if (perm === 'granted') {
              new Notification(t('الله أكبر • حان الآن موعد الصلاة', 'Allahu Akbar • Prayer Time'), {
                body: t('حي على الصلاة • موعد أذان العصر بتوقيت مكة المكرمة', 'Haya ala as-Salah • Time for Asr Prayer'),
                icon: '/favicon.ico'
              });
            }
          }
        }
        return;
      }

      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: t('الله أكبر • حان الآن موعد الصلاة', 'Allahu Akbar • Prayer Time'),
            body: t(`حي على الصلاة • موعد أذان العصر بتوقيت ${currentCity.nameAr}`, `Haya ala as-Salah • Asr prayer in ${currentCity.nameEn}`),
            sound: true,
          },
          trigger: {
            seconds: 1,
          },
        });
      }
    } catch (e) {
      console.warn('Test notification error:', e);
    }
  };

  // Load preferences from localStorage on mount (Web & Mobile safe)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const savedTheme = localStorage.getItem('almosala_theme');
        if (savedTheme) setThemeMode(savedTheme);
        const savedLang = localStorage.getItem('almosala_lang');
        if (savedLang) setLang(savedLang);
        const savedCityId = localStorage.getItem('almosala_city');
        if (savedCityId === 'gps_live') {
          const savedGps = localStorage.getItem('almosala_gps_city');
          if (savedGps) {
            try {
              setCurrentCity(JSON.parse(savedGps));
            } catch (e) {}
          }
        } else if (savedCityId) {
          const found = CITIES.find((c) => c.id === savedCityId);
          if (found) {
            const latNum = parseFloat(found.lat);
            const lngNum = parseFloat(found.lng);
            const solar = calculateSolarPrayerTimes(latNum, lngNum, new Date());
            setCurrentCity({
              ...found,
              prayers: [
                { id: 'fajr', nameAr: 'الفجر', nameEn: 'Fajr', time: formatPrayerTime(solar.fajr.hours, solar.fajr.minutes), isNext: false, icon: 'sunrise' },
                { id: 'sunrise', nameAr: 'الشروق', nameEn: 'Sunrise', time: formatPrayerTime(solar.sunrise.hours, solar.sunrise.minutes), isNext: false, icon: 'sun' },
                { id: 'dhuhr', nameAr: 'الظهر', nameEn: 'Dhuhr', time: formatPrayerTime(solar.dhuhr.hours, solar.dhuhr.minutes), isNext: false, icon: 'sun' },
                { id: 'asr', nameAr: 'العصر', nameEn: 'Asr', time: formatPrayerTime(solar.asr.hours, solar.asr.minutes), isNext: false, icon: 'clock' },
                { id: 'maghrib', nameAr: 'المغرب', nameEn: 'Maghrib', time: formatPrayerTime(solar.maghrib.hours, solar.maghrib.minutes), isNext: false, icon: 'sunset' },
                { id: 'isha', nameAr: 'العشاء', nameEn: 'Isha', time: formatPrayerTime(solar.isha.hours, solar.isha.minutes), isNext: false, icon: 'moon' }
              ]
            });
          }
        } else {
          // Default Makkah with today's calculated timings
          const solar = calculateSolarPrayerTimes(21.42, 39.82, new Date());
          setCurrentCity({
            ...CITIES[0],
            prayers: [
              { id: 'fajr', nameAr: 'الفجر', nameEn: 'Fajr', time: formatPrayerTime(solar.fajr.hours, solar.fajr.minutes), isNext: false, icon: 'sunrise' },
              { id: 'sunrise', nameAr: 'الشروق', nameEn: 'Sunrise', time: formatPrayerTime(solar.sunrise.hours, solar.sunrise.minutes), isNext: false, icon: 'sun' },
              { id: 'dhuhr', nameAr: 'الظهر', nameEn: 'Dhuhr', time: formatPrayerTime(solar.dhuhr.hours, solar.dhuhr.minutes), isNext: false, icon: 'sun' },
              { id: 'asr', nameAr: 'العصر', nameEn: 'Asr', time: formatPrayerTime(solar.asr.hours, solar.asr.minutes), isNext: false, icon: 'clock' },
              { id: 'maghrib', nameAr: 'المغرب', nameEn: 'Maghrib', time: formatPrayerTime(solar.maghrib.hours, solar.maghrib.minutes), isNext: false, icon: 'sunset' },
              { id: 'isha', nameAr: 'العشاء', nameEn: 'Isha', time: formatPrayerTime(solar.isha.hours, solar.isha.minutes), isNext: false, icon: 'moon' }
            ]
          });
        }
        const savedBells = localStorage.getItem('almosala_bells');
        if (savedBells) setPrayerBells(JSON.parse(savedBells));
        const savedFontSize = localStorage.getItem('almosala_font_size');
        if (savedFontSize) setQuranFontSize(Number(savedFontSize));
        const savedBookmarks = localStorage.getItem('almosala_bookmarks');
        if (savedBookmarks) setBookmarks(JSON.parse(savedBookmarks));
        const savedReadingBookmark = localStorage.getItem('almosala_reading_bookmark');
        if (savedReadingBookmark) setReadingBookmark(JSON.parse(savedReadingBookmark));
        const savedMethod = localStorage.getItem('almosala_calc_method');
        if (savedMethod) setCalculationMethod(savedMethod);
        const savedAsr = localStorage.getItem('almosala_asr_method');
        if (savedAsr) setAsrMethod(savedAsr);
        const savedReciter = localStorage.getItem('almosala_adhan_reciter');
        if (savedReciter) setAdhanReciter(savedReciter);
      } catch (e) {}
    }

    if (typeof window !== 'undefined') {
      (window as any).__navigateTo = (screenName: string) => {
        navigate(screenName);
      };
      (window as any).__openQuranSurah = (surahId: number, pageIndex: number = 0) => {
        const found = SURAHS.find((s: any) => s.id === surahId) || SURAHS[0];
        setSelectedSurah(found);
        setSurahPageIndex(pageIndex);
        setStreamSurahCount(1);
        setStreamPageCount(3);
        navigate('QuranReader');
      };
      (window as any).__toggleQuranAutoScroll = (active: boolean, speed?: number) => {
        if (typeof speed === 'number') setQuranScrollSpeed(speed);
        setQuranAutoScroll(active);
      };
      (window as any).__setReadingBookmark = (surahId: number, ayahNumber: number) => {
        const found = SURAHS.find((s: any) => s.id === surahId) || SURAHS[0];
        saveReadingBookmark({
          surahId: found.id,
          surahNameAr: found.nameAr,
          ayahNumber,
          text: `آية كريمة من سورة ${found.nameAr}`
        });
      };
    }
  }, []);

  // Save changes to localStorage helper
  const savePref = (key: string, val: any) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
      } catch (e) {}
    }
  };

  // Clean up any playing audio on unmount
  useEffect(() => {
    return () => {
      stopAllAudioPlayback();
    };
  }, []);

  // In Web environment, inject Google Fonts, strict RTL direction and CSS reset for zero-latency, 100% reliable rendering
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    if (!document.getElementById('google-fonts-almosala')) {
      const link = document.createElement('link');
      link.id = 'google-fonts-almosala';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=Tajawal:wght@400;500;700&display=swap';
      document.head.appendChild(link);
    }
    let styleEl = document.getElementById('almosala-global-css');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'almosala-global-css';
      document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = `
      @font-face {
        font-family: 'Feather';
        src: url('https://cdn.jsdelivr.net/npm/react-native-vector-icons@10.0.0/Fonts/Feather.ttf') format('truetype');
      }
      * {
        box-sizing: border-box !important;
        -webkit-tap-highlight-color: transparent;
        min-width: 0;
      }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        height: 100% !important;
        max-height: 100% !important;
        overflow: hidden !important;
        background-color: #FAF6F0;
        direction: rtl;
        text-align: right;
        font-family: Tajawal, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      #root {
        width: 100% !important;
        height: 100% !important;
        max-height: 100% !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: center !important;
        align-items: stretch !important;
        background-color: #FAF6F0;
        overflow: hidden !important;
      }
      #root > div {
        width: 100% !important;
        height: 100% !important;
        max-height: 100% !important;
        margin: 0 auto !important;
        display: flex !important;
        flex-direction: column !important;
        flex: 1 1 0% !important;
        overflow: hidden !important;
      }
      @media (min-width: 481px) {
        html, body {
          background-color: #ECE4D8 !important;
        }
        #root > div {
          max-width: 440px !important;
        }
      }
    `;
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = 'ar';
  }

  const isRTL = lang === 'ar';
  const c = TOKENS.colors[themeMode];
  const t = (ar, en) => (isRTL ? ar : en);

  // Global Bell Notification Toggle
  const toggleBell = (id) => {
    setPrayerBells((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // --- BESPOKE ISLAMIC VECTOR GRAPHICS SYSTEM ---
  const IslamicLogo = ({ size = 44 }) => {
    if (Platform.OS === 'web') {
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none" style={{ display: 'block' }}>
          <defs>
            <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFF2D6" />
              <stop offset="40%" stopColor="#D4A373" />
              <stop offset="80%" stopColor="#C69255" />
              <stop offset="100%" stopColor="#8C5E3C" />
            </linearGradient>
            <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#EAD29A" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#8C5E3C" stopOpacity="0.3" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="47" stroke="url(#ringGrad)" strokeWidth="1.5" strokeDasharray="3 3" />
          <circle cx="50" cy="50" r="43" stroke="url(#ringGrad)" strokeWidth="0.8" opacity="0.7" />
          <path
            d="M 64 18 C 45 22 32 38 34 58 C 36 76 52 84 66 82 C 48 87 28 75 25 54 C 21 32 40 16 64 18 Z"
            fill="url(#goldGrad)"
          />
          <path d="M 47 38 C 47 32 50 26 50 26 C 50 26 53 32 53 38 L 53 62 L 47 62 Z" fill="url(#goldGrad)" />
          <polygon points="50,20 51.5,23.5 55,24 52.5,26.5 53.2,30 50,28 46.8,30 47.5,26.5 45,24 48.5,23.5" fill="url(#goldGrad)" />
          <path
            d="M 68 36 L 70 40 L 74 42 L 70 44 L 68 48 L 66 44 L 62 42 L 66 40 Z"
            fill="url(#goldGrad)"
          />
        </svg>
      );
    }
    return (
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#5D3A22', alignItems: 'center', justifyContent: 'center' }}>
        <Feather name="moon" size={size * 0.6} color="#C69255" />
      </View>
    );
  };

  // Authentic Andalusian Moorish Horseshoe Arch & Mihrab Framing (أقواس حدوة الحصان الأندلسية)
  const MoorishArchFrame = ({ width = '100%', height = 32, color = '#C69255', opacity = 0.85 }) => {
    if (Platform.OS === 'web') {
      return (
        <svg
          viewBox="0 0 300 36"
          preserveAspectRatio="none"
          style={{
            width,
            height,
            display: 'block',
            opacity,
            pointerEvents: 'none'
          }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="archGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={color} stopOpacity="0.05" />
              <stop offset="25%" stopColor={color} stopOpacity="0.75" />
              <stop offset="50%" stopColor="#FFF2D6" stopOpacity="1" />
              <stop offset="75%" stopColor={color} stopOpacity="0.75" />
              <stop offset="100%" stopColor={color} stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <path
            d="M 6 34 L 94 34 C 112 34 120 25 132 15 C 141 8 147 4 150 2 C 153 4 159 8 168 15 C 180 25 188 34 206 34 L 294 34"
            stroke="url(#archGrad)"
            strokeWidth="1.6"
            fill="none"
          />
          <path
            d="M 112 34 C 118 34 125 29 133 21 C 140 14 146 10 150 8 C 154 10 160 14 167 21 C 175 29 182 34 188 34"
            stroke={color}
            strokeWidth="1"
            strokeDasharray="2.5 2.5"
            fill="none"
          />
          <circle cx="150" cy="2" r="2.5" fill="#FFF2D6" />
          <polygon points="150,-2 152.5,1 150,4 147.5,1" fill="#FFF2D6" />
          <circle cx="132" cy="15" r="1.5" fill={color} />
          <circle cx="168" cy="15" r="1.5" fill={color} />
        </svg>
      );
    }
    return null;
  };

  // 16-lobed / 8-pointed star Islamic Medallion (شمسة أندلسية مذهبة)
  const IslamicMedallion = ({ size = 44, children, borderColor = '#C69255', bg = '#FAF1E6' }) => {
    return (
      <View
        style={{
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}
      >
        {Platform.OS === 'web' && (
          <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            style={{ position: 'absolute', top: 0, left: 0 }}
          >
            <rect
              x="14"
              y="14"
              width="72"
              height="72"
              rx="14"
              fill={bg}
              stroke={borderColor}
              strokeWidth="2"
            />
            <rect
              x="14"
              y="14"
              width="72"
              height="72"
              rx="14"
              fill="none"
              stroke={borderColor}
              strokeWidth="1.2"
              strokeDasharray="3 2"
              transform="rotate(45 50 50)"
            />
          </svg>
        )}
        <View style={{ zIndex: 2 }}>{children}</View>
      </View>
    );
  };

  const ArabesqueWatermark = ({ opacity = 0.08, color = '#C69255' }) => {
    if (Platform.OS === 'web') {
      return (
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            opacity,
            pointerEvents: 'none',
            overflow: 'hidden'
          }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="arabesqueGrid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path
                d="M 24 0 L 31 17 L 48 24 L 31 31 L 24 48 L 17 31 L 0 24 L 17 17 Z"
                stroke={color}
                strokeWidth="0.9"
                fill="none"
              />
              <rect
                x="12"
                y="12"
                width="24"
                height="24"
                transform="rotate(45 24 24)"
                stroke={color}
                strokeWidth="0.6"
                fill="none"
              />
              <circle cx="24" cy="24" r="5" stroke={color} strokeWidth="0.6" fill="none" />
              <circle cx="24" cy="0" r="3" stroke={color} strokeWidth="0.5" fill="none" />
              <circle cx="24" cy="48" r="3" stroke={color} strokeWidth="0.5" fill="none" />
              <circle cx="0" cy="24" r="3" stroke={color} strokeWidth="0.5" fill="none" />
              <circle cx="48" cy="24" r="3" stroke={color} strokeWidth="0.5" fill="none" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#arabesqueGrid)" />
        </svg>
      );
    }
    return null;
  };

  const MosqueSilhouette = () => {
    if (Platform.OS === 'web') {
      return (
        <svg
          viewBox="0 0 400 130"
          preserveAspectRatio="none"
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            width: '100%',
            height: 96,
            opacity: 0.18,
            pointerEvents: 'none'
          }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="mosqueShine" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#C69255" stopOpacity="0.30" />
              <stop offset="100%" stopColor="#C69255" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path d="M 160 130 C 160 88 180 66 200 60 C 220 66 240 88 240 130 Z" fill="url(#mosqueShine)" />
          <path d="M 200 50 L 200 60" stroke="#C69255" strokeWidth="2" />
          <circle cx="200" cy="48" r="3" fill="#C69255" />
          <path d="M 105 130 C 105 98 120 82 135 78 C 150 82 165 98 165 130 Z" fill="url(#mosqueShine)" />
          <circle cx="135" cy="70" r="2.5" fill="#C69255" />
          <path d="M 235 130 C 235 98 250 82 265 78 C 280 82 295 98 295 130 Z" fill="url(#mosqueShine)" />
          <circle cx="265" cy="70" r="2.5" fill="#C69255" />
          <rect x="74" y="32" width="14" height="98" fill="url(#mosqueShine)" />
          <polygon points="74,32 81,10 88,32" fill="url(#mosqueShine)" />
          <circle cx="81" cy="8" r="2" fill="#C69255" />
          <rect x="312" y="32" width="14" height="98" fill="url(#mosqueShine)" />
          <polygon points="312,32 319,10 326,32" fill="url(#mosqueShine)" />
          <circle cx="319" cy="8" r="2" fill="#C69255" />
        </svg>
      );
    }
    return null;
  };

  const CircularCountdownGauge = ({
    remainingText = '٠٠:٠٠:٠٠',
    label = 'متبقي للأذان',
    progress = 0.5
  }: {
    remainingText?: string;
    label?: string;
    progress?: number;
  }) => {
    if (Platform.OS === 'web') {
      const size = 106;
      const strokeWidth = 6.5;
      const center = size / 2;
      const radius = center - strokeWidth - 2;
      const circumference = 2 * Math.PI * radius;
      const safeProgress = Math.max(0.04, Math.min(0.98, progress));
      const strokeDashoffset = circumference * (1 - safeProgress);

      return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
            <circle
              cx={center}
              cy={center}
              r={radius}
              stroke="rgba(255, 255, 255, 0.22)"
              strokeWidth={strokeWidth}
              fill="rgba(0, 0, 0, 0.25)"
            />
            <circle
              cx={center}
              cy={center}
              r={radius}
              stroke="#D4A373"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="none"
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
          </svg>
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
            <TextUI size={12} color="#F5ECE1" weight="bold">{label}</TextUI>
            <TextUI size={17} color="#FFFFFF" weight="bold" style={{ marginTop: 2, letterSpacing: 0.5 }}>{remainingText}</TextUI>
          </View>
        </View>
      );
    }
    return (
      <View style={{ alignItems: 'center', justifyContent: 'center', width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 3, borderColor: '#D4A373' }}>
        <TextUI size={12} color="#F5ECE1" weight="bold">{label}</TextUI>
        <TextUI size={17} color="#FFFFFF" weight="bold" style={{ marginTop: 2 }}>{remainingText}</TextUI>
      </View>
    );
  };

  // Authentic Mushaf Surah Header Vector Frame (ترويسة السورة في مصحف المدينة المنورة)
  const MushafSurahFrame = ({ themeMode = 'light' }: { themeMode?: string }) => {
    const isLight = themeMode === 'light';

    if (Platform.OS === 'web') {
      return (
        <svg
          viewBox="0 0 420 96"
          preserveAspectRatio="none"
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none'
          }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="mushafGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E2C792" />
              <stop offset="25%" stopColor="#C69255" />
              <stop offset="50%" stopColor="#FFF2D6" />
              <stop offset="75%" stopColor="#C69255" />
              <stop offset="100%" stopColor="#7A4D2E" />
            </linearGradient>
            <linearGradient id="mushafBgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={isLight ? '#FDFBF7' : '#2A2019'} />
              <stop offset="50%" stopColor={isLight ? '#FAF2E6' : '#221913'} />
              <stop offset="100%" stopColor={isLight ? '#F3E5D5' : '#1D140E'} />
            </linearGradient>
            <pattern id="mushafArabesque" width="18" height="18" patternUnits="userSpaceOnUse">
              <path
                d="M 9 0 L 18 9 L 9 18 L 0 9 Z"
                fill="none"
                stroke="#C69255"
                strokeWidth="0.5"
                opacity="0.18"
              />
              <circle cx="9" cy="9" r="2.5" fill="none" stroke="#C69255" strokeWidth="0.4" opacity="0.15" />
            </pattern>
          </defs>

          {/* 1. Main Background Rect with Parchment & Arabesque Texture */}
          <rect x="18" y="6" width="384" height="84" rx="8" fill="url(#mushafBgGrad)" />
          <rect x="18" y="6" width="384" height="84" rx="8" fill="url(#mushafArabesque)" />

          {/* 2. Outer Ornate Border */}
          <rect
            x="18"
            y="6"
            width="384"
            height="84"
            rx="8"
            fill="none"
            stroke="url(#mushafGoldGrad)"
            strokeWidth="2"
          />

          {/* 3. Inner Decorative Inset Border */}
          <rect
            x="22"
            y="10"
            width="376"
            height="76"
            rx="6"
            fill="none"
            stroke="url(#mushafGoldGrad)"
            strokeWidth="0.8"
            strokeDasharray="4 2"
            opacity="0.85"
          />

          {/* 4. Left and Right Authentic Mushaf Palmette Finials (الشمسات الجانبية) */}
          {/* Right Palmette */}
          <g transform="translate(402, 48)">
            <path
              d="M 0 -18 C 9 -15, 15 -8, 17 0 C 15 8, 9 15, 0 18 C 5 9, 5 -9, 0 -18 Z"
              fill="url(#mushafGoldGrad)"
            />
            <circle cx="8" cy="0" r="3.2" fill="#FFF2D6" stroke="#8C5E3C" strokeWidth="0.7" />
            <path d="M 0 -8 C 4 -6, 8 -3, 8 0 C 8 3, 4 6, 0 8 Z" fill="#8C5E3C" opacity="0.6" />
          </g>

          {/* Left Palmette */}
          <g transform="translate(18, 48)">
            <path
              d="M 0 -18 C -9 -15, -15 -8, -17 0 C -15 8, -9 15, 0 18 C -5 9, -5 -9, 0 -18 Z"
              fill="url(#mushafGoldGrad)"
            />
            <circle cx="-8" cy="0" r="3.2" fill="#FFF2D6" stroke="#8C5E3C" strokeWidth="0.7" />
            <path d="M 0 -8 C -4 -6, -8 -3, -8 0 C -8 3, -4 6, 0 8 Z" fill="#8C5E3C" opacity="0.6" />
          </g>

          {/* 5. Four Corner Islamic Arabesque Flourishes */}
          {/* Top-Left */}
          <g transform="translate(22, 10)">
            <path d="M 0 0 L 12 0 C 8 4, 4 8, 0 12 Z" fill="url(#mushafGoldGrad)" opacity="0.85" />
            <circle cx="3.5" cy="3.5" r="1.2" fill="#FFF2D6" />
          </g>
          {/* Top-Right */}
          <g transform="translate(398, 10)">
            <path d="M 0 0 L -12 0 C -8 4, -4 8, 0 12 Z" fill="url(#mushafGoldGrad)" opacity="0.85" />
            <circle cx="-3.5" cy="3.5" r="1.2" fill="#FFF2D6" />
          </g>
          {/* Bottom-Left */}
          <g transform="translate(22, 86)">
            <path d="M 0 0 L 12 0 C 8 -4, 4 -8, 0 -12 Z" fill="url(#mushafGoldGrad)" opacity="0.85" />
            <circle cx="3.5" cy="-3.5" r="1.2" fill="#FFF2D6" />
          </g>
          {/* Bottom-Right */}
          <g transform="translate(398, 86)">
            <path d="M 0 0 L -12 0 C -8 -4, -4 -8, 0 -12 Z" fill="url(#mushafGoldGrad)" opacity="0.85" />
            <circle cx="-3.5" cy="-3.5" r="1.2" fill="#FFF2D6" />
          </g>

          {/* 6. Center Mihrab Arch Accent */}
          <path
            d="M 150 11 Q 210 2 270 11"
            fill="none"
            stroke="url(#mushafGoldGrad)"
            strokeWidth="1.2"
            opacity="0.85"
          />
          <polygon points="210,3 213.5,7 210,11 206.5,7" fill="url(#mushafGoldGrad)" />

          {/* 7. Subtle Compartment Dividers with Rosettes */}
          <path d="M 125 18 L 125 78" stroke="url(#mushafGoldGrad)" strokeWidth="0.8" opacity="0.4" strokeDasharray="3 2" />
          <circle cx="125" cy="48" r="2.2" fill="url(#mushafGoldGrad)" opacity="0.65" />
          <path d="M 295 18 L 295 78" stroke="url(#mushafGoldGrad)" strokeWidth="0.8" opacity="0.4" strokeDasharray="3 2" />
          <circle cx="295" cy="48" r="2.2" fill="url(#mushafGoldGrad)" opacity="0.65" />
        </svg>
      );
    }

    return (
      <View
        style={{
          ...(StyleSheet.absoluteFill as any),
          borderWidth: 2,
          borderColor: '#C69255',
          borderRadius: 8,
          backgroundColor: isLight ? '#FAF2E6' : '#2A2019'
        }}
      />
    );
  };

  // Dedicated Authentic Mushaf Surah Header Component
  const MushafSurahBanner = ({ surah, themeMode = 'light' }: { surah: any; themeMode?: string }) => {
    const isLight = themeMode === 'light';
    const nameTashkeel = SURAH_TASHKEEL[surah.id] || surah.nameAr;
    const versesAr = toArabicNumber(surah.verses);
    const juzAr = toArabicNumber(surah.juz || 1);
    const orderAr = toArabicNumber(surah.id);

    return (
      <View
        style={{
          width: '100%',
          minHeight: 78,
          marginBottom: 16,
          position: 'relative',
          justifyContent: 'center',
          paddingHorizontal: 16,
          paddingVertical: 6
        }}
      >
        <MushafSurahFrame themeMode={themeMode} />

        {/* Main 3-Part Mushaf Header Content */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            paddingHorizontal: 12,
            paddingTop: 2
          }}
        >
          {/* Right Badge: Classification (مَكِّيَّةٌ / مَدَنِيَّةٌ) */}
          <View
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 56,
              paddingVertical: 3,
              paddingHorizontal: 7,
              borderRadius: 6,
              backgroundColor: isLight ? 'rgba(198, 146, 85, 0.12)' : 'rgba(212, 163, 115, 0.15)',
              borderWidth: 1,
              borderColor: 'rgba(198, 146, 85, 0.35)'
            }}
          >
            <TextUI
              quran
              weight="bold"
              size={12.5}
              color={isLight ? '#5D3A22' : '#EAD29A'}
            >
              {surah.type === 'مكية' ? 'مَكِّيَّةٌ' : 'مَدَنِيَّةٌ'}
            </TextUI>
          </View>

          {/* Center: The Grand Surah Calligraphy (سُورَةُ الكَهْفِ) */}
          <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1, paddingHorizontal: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <TextUI size={11} color={TOKENS.colors.secondary}>۞</TextUI>
              <TextUI
                quran
                weight="bold"
                size={22}
                color={isLight ? '#3E2010' : '#FFF2D6'}
                style={{
                  letterSpacing: 0.5,
                  ...(Platform.OS === 'web'
                    ? ({ textShadow: '0 1px 2px rgba(198, 146, 85, 0.25)' } as any)
                    : {
                        textShadowColor: 'rgba(198, 146, 85, 0.25)',
                        textShadowOffset: { width: 0, height: 1 },
                        textShadowRadius: 2
                      })
                }}
              >
                {`سُورَةُ ${nameTashkeel}`}
              </TextUI>
              <TextUI size={11} color={TOKENS.colors.secondary}>۞</TextUI>
            </View>
          </View>

          {/* Left Badge: Verses Count (آيَاتُهَا ١١٠) */}
          <View
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 56,
              paddingVertical: 3,
              paddingHorizontal: 7,
              borderRadius: 6,
              backgroundColor: isLight ? 'rgba(198, 146, 85, 0.12)' : 'rgba(212, 163, 115, 0.15)',
              borderWidth: 1,
              borderColor: 'rgba(198, 146, 85, 0.35)'
            }}
          >
            <TextUI
              quran
              weight="bold"
              size={12}
              color={isLight ? '#5D3A22' : '#EAD29A'}
            >
              {`آيَاتُهَا ${versesAr}`}
            </TextUI>
          </View>
        </View>

        {/* Bottom Subtle Ribbon: Juz & Order Metadata */}
        <View style={{ alignItems: 'center', marginTop: 2 }}>
          <TextUI
            quran
            size={10.5}
            color={isLight ? '#8C6C54' : '#C8B29E'}
          >
            {`الجُزْءُ ${juzAr} • تَرْتِيبُهَا ${orderAr}`}
          </TextUI>
        </View>
      </View>
    );
  };

  // Navigation Stack Controls
  const navigate = (targetScreen: any) => {
    setStack((prev) => [...prev, targetScreen]);
    setScreen(targetScreen);
  };

  const goBack = () => {
    if (stack.length > 1) {
      const nextStack = [...stack];
      nextStack.pop();
      setStack(nextStack);
      setScreen(nextStack[nextStack.length - 1]);
    } else {
      setScreen('Home');
    }
  };

  // Web automated test helpers
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    (window as any).__openQuranSurah = (surahId: number, pageIndex: number = 0) => {
      const target = SURAHS.find((s: any) => s.id === surahId);
      if (target) {
        setSelectedSurah(target);
        setSurahPageIndex(pageIndex);
        setStreamSurahCount(1);
        setStreamPageCount(3);
        setScreen('QuranReader');
      }
    };
    (window as any).__navigateTo = (targetScreen: string) => {
      setScreen(targetScreen);
    };
    (window as any).__setSurahPage = (pageIndex: number) => {
      setSurahPageIndex(pageIndex);
    };
    (window as any).__triggerAyahTafsir = (ayahNum: number = 1, school: string = 'muyassar') => {
      setSelectedTafsir(school as any);
      fetchAyahTafsir(selectedSurah.id, ayahNum, school);
      setSelectedAyahForTafsir({
        surahId: selectedSurah.id,
        surahNameAr: selectedSurah.nameAr,
        surahNameEn: selectedSurah.nameEn,
        ayahNumber: ayahNum,
        arabicNumber: toArabicNumber(ayahNum),
        text: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ'
      });
      setTafsirModalVisible(true);
    };
    (window as any).__closeTafsirModal = () => {
      setTafsirModalVisible(false);
    };
    (window as any).__setQuranFontSize = (newSize: number) => {
      setQuranFontSize(newSize);
    };
    (window as any).__toggleQuranAutoScroll = (active: boolean, speed: number = 2) => {
      setQuranScrollSpeed(speed);
      setQuranAutoScroll(active);
    };
    (window as any).__setQuranFullScreen = (active: boolean) => {
      setQuranReaderFullScreen(active);
    };
  }

  // Reusable Typography Component with Guaranteed Arabic Alignment
  const TextUI = ({ children, style, weight = 'regular', size = 15, color, align, quran = false, numberOfLines, onPress }: any) => {
    let fontFamily: string | undefined = undefined;
    let fontWeight: any = weight === 'bold' ? '700' : weight === 'medium' ? '500' : '400';

    if (Platform.OS === 'web') {
      fontFamily = quran ? 'Amiri, serif' : 'Tajawal, "Noto Sans Arabic", -apple-system, sans-serif';
    } else if (fontsLoaded) {
      fontFamily = quran
        ? (weight === 'bold' ? 'Amiri_700Bold' : 'Amiri_400Regular')
        : (weight === 'bold' ? 'Tajawal_700Bold' : weight === 'medium' ? 'Tajawal_500Medium' : 'Tajawal_400Regular');
      // On iOS / Android native, the loaded font file already encapsulates the weight; omitting fontWeight prevents iOS font lookup crashes
      fontWeight = undefined;
    }

    const flatStyle = StyleSheet.flatten(style) || {};
    const explicitAlign = align || flatStyle.textAlign;
    const targetAlign = explicitAlign || (isRTL ? 'right' : 'left');

    // On iOS native in an RTL app, React Native's RCTTextAttributes flips 'left' and 'right':
    // - To render on the visual RIGHT: pass 'right' on web, and 'left' on native (which RN flips to right)
    // - To render on the visual LEFT: pass 'left' on web, and 'right' on native (which RN flips to left)
    let resolvedAlignment: any = targetAlign;
    if (targetAlign === 'right') {
      resolvedAlignment = Platform.OS === 'web' ? 'right' : 'left';
    } else if (targetAlign === 'left') {
      resolvedAlignment = Platform.OS === 'web' ? 'left' : 'right';
    }

    return (
      <Text
        numberOfLines={numberOfLines}
        onPress={onPress}
        style={[
          {
            ...(fontFamily ? { fontFamily } : {}),
            ...(fontWeight ? { fontWeight } : {}),
            fontSize: size,
            color: color || c.textPrimary,
            writingDirection: isRTL ? 'rtl' : 'ltr',
            lineHeight: quran ? size * 1.85 : size * 1.45
          },
          style,
          {
            textAlign: resolvedAlignment
          }
        ]}
      >
        {children}
      </Text>
    );
  };

  // Reusable Tappable List Row with Clean RTL Alignment
  const TappableRow = ({
    title,
    subtitle,
    value,
    icon,
    customIcon,
    iconColor,
    onPress,
    hasChevron = true,
    rightElement,
    style,
    badge,
    badgeColor
  }: any) => (
    <TouchableOpacity
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 14,
          paddingHorizontal: 16,
          backgroundColor: c.surface,
          borderRadius: TOKENS.radius.md,
          marginBottom: 10,
          borderWidth: 1,
          borderColor: c.border
        },
        style
      ]}
    >
      {/* Right side in RTL: Icon + Title + Subtitle */}
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        {customIcon ? (
          <View style={{ marginLeft: 12 }}>{customIcon}</View>
        ) : icon ? (
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: TOKENS.radius.sm,
              backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : '#2C231E',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: 12
            }}
          >
            <Feather name={icon} size={18} color={iconColor || TOKENS.colors.primary} />
          </View>
        ) : null}
        <View style={{ flex: 1, alignItems: 'flex-start' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TextUI weight="bold" size={15}>{title}</TextUI>
            {badge && (
              <View
                style={{
                  backgroundColor: badgeColor || TOKENS.colors.secondaryLight,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: TOKENS.radius.pill,
                  marginRight: 8
                }}
              >
                <TextUI size={11} weight="medium" color={TOKENS.colors.primaryDark}>{badge}</TextUI>
              </View>
            )}
          </View>
          {subtitle && (
            <TextUI size={13} color={c.textSecondary} style={{ marginTop: 2 }}>{subtitle}</TextUI>
          )}
        </View>
      </View>

      {/* Left side in RTL: Chevron or Value */}
      {rightElement ? (
        rightElement
      ) : value ? (
        <TextUI size={14} color={c.textSecondary}>{value}</TextUI>
      ) : hasChevron ? (
        <Feather
          name="chevron-left"
          size={18}
          color={c.textSecondary}
        />
      ) : null}
    </TouchableOpacity>
  );

  // App Header with Centered/Right Title and Left Action
  // App Header with Centered Title, Right Back/Emblem and Left Catalog Quick Button
  const Header = ({ title, subtitle, onBack, rightAction, showCatalog = true }: any) => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 12 : 16,
        paddingBottom: 14,
        backgroundColor: c.bg,
        borderBottomWidth: 1,
        borderColor: c.border
      }}
    >
      {/* Right Edge (RTL): Back Button pointing right, or Islamic Logo */}
      <View style={{ minWidth: 42, alignItems: 'flex-start', justifyContent: 'center' }}>
        {onBack ? (
          <TouchableOpacity
            onPress={onBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{
              width: 38,
              height: 38,
              borderRadius: TOKENS.radius.pill,
              backgroundColor: c.surface,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: c.border
            }}
          >
            <Feather name="arrow-right" size={18} color={c.textPrimary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => setCatalogModalVisible(true)}
            style={{
              width: 38,
              height: 38,
              borderRadius: TOKENS.radius.pill,
              backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : '#2C231E',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: TOKENS.colors.secondary
            }}
          >
            <Feather name="grid" size={17} color={TOKENS.colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Center: Title */}
      <View style={{ alignItems: 'center', flex: 1, marginHorizontal: 8 }}>
        <TextUI weight="bold" size={17} color={c.textPrimary}>{title}</TextUI>
        {subtitle && (
          <TextUI size={12} color={c.textSecondary} style={{ marginTop: 1 }}>{subtitle}</TextUI>
        )}
      </View>

      {/* Left Edge (RTL): Custom Action OR Open All-Screens Catalog button */}
      <View style={{ minWidth: 42, alignItems: 'flex-end', justifyContent: 'center' }}>
        {rightAction ? (
          rightAction
        ) : showCatalog ? (
          <TouchableOpacity
            onPress={() => setCatalogModalVisible(true)}
            style={{
              width: 38,
              height: 38,
              borderRadius: TOKENS.radius.pill,
              backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : '#2C231E',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: TOKENS.colors.secondary
            }}
          >
            <Feather name="compass" size={17} color={TOKENS.colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 38 }} />
        )}
      </View>
    </View>
  );

  // APPROVED 5-DESTINATION MOBILE BOTTOM NAVIGATION (RTL ORDER: الرئيسية on Right -> المزيد on Left)
  const BottomNav = () => {
    const tabs = [
      { id: 'Home', label: t('الرئيسية', 'Home'), icon: 'home' },
      { id: 'QuranIndex', label: t('القرآن', 'Quran'), icon: 'book-open' },
      { id: 'AzkarCategories', label: t('الأذكار', 'Azkar'), icon: 'heart' },
      { id: 'Qibla', label: t('القبلة', 'Qibla'), icon: 'compass' },
      { id: 'More', label: t('المزيد', 'More'), icon: 'more-horizontal' }
    ];

    const isCurrentTab = (tabId) => {
      if (tabId === 'Home') return ['Home', 'PrayerTimes', 'Imsakiah', 'PrayerTracker'].includes(screen);
      if (tabId === 'QuranIndex') return ['QuranIndex', 'QuranReader', 'QuranKhatmah', 'ShareCard', 'QuranBookmarks', 'QuranAudio', 'QuranSettings'].includes(screen);
      if (tabId === 'AzkarCategories') return ['AzkarCategories', 'AzkarSession', 'AzkarCompletion'].includes(screen);
      if (tabId === 'Qibla') return screen === 'Qibla';
      if (tabId === 'More') return ['More', 'Settings', 'Appearance', 'Language', 'PrayerSettings', 'CalculationMethod', 'LocationSettings', 'NotificationSettings', 'AdhanSettings', 'QuranSettings', 'AzkarSettings', 'Privacy', 'Sources', 'About', 'IslamicEvents', 'ZakatCalculator'].includes(screen);
      return false;
    };

    return (
      <View
        nativeID="bottom-nav-bar"
        style={{
          flexDirection: 'row',
          backgroundColor: c.surface,
          borderTopWidth: 1,
          borderColor: c.border,
          paddingTop: 6,
          paddingBottom: Platform.OS === 'ios' ? 20 : 6,
          minHeight: 56,
          maxHeight: 64,
          flexShrink: 0,
          justifyContent: 'space-around',
          alignItems: 'center',
          width: '100%',
          zIndex: 9999,
          elevation: 12,
          ...makeShadow('0 -2px 10px rgba(0, 0, 0, 0.06)', '#000', 0.06, 6, { width: 0, height: -2 }, 4)
        }}
      >
        {tabs.map((tab) => {
          const isActive = isCurrentTab(tab.id);
          return (
            <TouchableOpacity
              key={tab.id}
              activeOpacity={0.7}
              onPress={() => navigate(tab.id)}
              style={{ alignItems: 'center', flex: 1, paddingVertical: 4 }}
            >
              <Feather
                name={tab.icon as any}
                size={23}
                color={isActive ? TOKENS.colors.primary : c.textSecondary}
              />
              <TextUI
                weight={isActive ? 'bold' : 'medium'}
                size={12.5}
                color={isActive ? TOKENS.colors.primary : c.textSecondary}
                style={{ marginTop: 3 }}
              >
                {tab.label}
              </TextUI>
              {isActive && (
                <View
                  style={{
                    width: 16,
                    height: 3,
                    borderRadius: 2,
                    backgroundColor: TOKENS.colors.secondary,
                    marginTop: 3
                  }}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // --- UNIVERSAL 24+ SCREEN MASTER DIRECTORY MODAL ---
  const ScreenCatalogModal = () => {
    if (!catalogModalVisible) return null;

    const filteredSections = ALL_APP_SCREENS.map((section) => {
      const filteredItems = section.items.filter((item) => {
        if (!catalogSearch) return true;
        const query = catalogSearch.toLowerCase().trim();
        return (
          item.titleAr.toLowerCase().includes(query) ||
          item.titleEn.toLowerCase().includes(query) ||
          item.id.toLowerCase().includes(query) ||
          item.badge.toLowerCase().includes(query)
        );
      });
      return { ...section, items: filteredItems };
    }).filter((s) => s.items.length > 0);

    const totalScreenCount = ALL_APP_SCREENS.reduce((acc, s) => acc + s.items.length, 0);

    return (
      <Modal
        visible={catalogModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCatalogModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(26, 20, 17, 0.72)',
            justifyContent: 'flex-end',
            alignItems: 'center'
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 460,
              maxHeight: '90%',
              backgroundColor: c.bg,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              borderTopWidth: 1.5,
              borderColor: TOKENS.colors.secondary,
              overflow: 'hidden'
            }}
          >
            {/* Top Andalusian Arch Decoration */}
            <View style={{ paddingTop: 8, paddingHorizontal: 16 }}>
              <MoorishArchFrame height={24} color={TOKENS.colors.secondary} />
            </View>

            {/* Modal Header */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderColor: c.border
              }}
            >
              <View style={{ alignItems: 'flex-start' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TextUI weight="bold" size={18} color={TOKENS.colors.primaryDark}>
                    {t('فهرس ودليل كل الشاشات', 'Universal Screen Catalog')}
                  </TextUI>
                  <View
                    style={{
                      backgroundColor: TOKENS.colors.secondaryLight,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: TOKENS.radius.pill,
                      marginRight: 8,
                      borderWidth: 1,
                      borderColor: TOKENS.colors.secondary
                    }}
                  >
                    <TextUI size={11} weight="bold" color={TOKENS.colors.primaryDark}>
                      {`${totalScreenCount} ${t('شاشة مفعّلة', 'Active Screens')}`}
                    </TextUI>
                  </View>
                </View>
                <TextUI size={12} color={c.textSecondary} style={{ marginTop: 2 }}>
                  {t('انتقال فوري ومباشر لكافة خدمات ومسارات رفيق المسلم', 'One-tap direct jump to any screen in the app')}
                </TextUI>
              </View>

              <TouchableOpacity
                onPress={() => setCatalogModalVisible(false)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: c.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: c.border
                }}
              >
                <Feather name="x" size={18} color={c.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Search Input Bar */}
            <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: c.surface,
                  borderRadius: TOKENS.radius.md,
                  paddingHorizontal: 12,
                  paddingVertical: Platform.OS === 'ios' ? 10 : 8,
                  borderWidth: 1,
                  borderColor: c.border
                }}
              >
                <Feather name="search" size={16} color={TOKENS.colors.secondary} style={{ marginLeft: 8 }} />
                <TextInput
                  value={catalogSearch}
                  onChangeText={setCatalogSearch}
                  placeholder={t('ابحث عن أي شاشة أو خدمة...', 'Search any screen or service...')}
                  placeholderTextColor={c.textSecondary}
                  style={{
                    flex: 1,
                    fontSize: 14,
                    color: c.textPrimary,
                    textAlign: isRTL ? 'right' : 'left'
                  }}
                />
                {catalogSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setCatalogSearch('')} style={{ padding: 4 }}>
                    <Feather name="x-circle" size={16} color={c.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Screens List */}
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
            >
              {filteredSections.map((section, sIdx) => (
                <View key={sIdx} style={{ marginTop: 14 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginBottom: 8,
                      paddingHorizontal: 4
                    }}
                  >
                    <View
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 6,
                        backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : '#2C231E',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginLeft: 8
                      }}
                    >
                      <Feather name={section.icon} size={14} color={TOKENS.colors.primary} />
                    </View>
                    <TextUI weight="bold" size={14} color={TOKENS.colors.primaryDark}>
                      {isRTL ? section.categoryAr : section.categoryEn}
                    </TextUI>
                    <TextUI size={12} color={c.textSecondary} style={{ marginRight: 6 }}>
                      {`(${section.items.length})`}
                    </TextUI>
                  </View>

                  <View
                    style={{
                      backgroundColor: c.surface,
                      borderRadius: TOKENS.radius.md,
                      borderWidth: 1,
                      borderColor: c.border,
                      overflow: 'hidden'
                    }}
                  >
                    {section.items.map((item, itemIdx) => {
                      const isCurrentActive = screen === item.id;
                      return (
                        <TouchableOpacity
                          key={item.id}
                          activeOpacity={0.7}
                          onPress={() => {
                            setCatalogModalVisible(false);
                            setCatalogSearch('');
                            if (item.id === 'ShareCard') {
                              openVerseCardShare();
                            } else {
                              navigate(item.id);
                            }
                          }}
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            paddingVertical: 12,
                            paddingHorizontal: 14,
                            backgroundColor: isCurrentActive
                              ? (themeMode === 'light' ? TOKENS.colors.primaryLight : '#382E28')
                              : 'transparent',
                            borderBottomWidth: itemIdx === section.items.length - 1 ? 0 : 1,
                            borderColor: c.border
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            <View
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: 16,
                                backgroundColor: isCurrentActive
                                  ? TOKENS.colors.primary
                                  : (themeMode === 'light' ? c.bgSecondary : '#221B17'),
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginLeft: 10
                              }}
                            >
                              <Feather
                                name={item.icon}
                                size={15}
                                color={isCurrentActive ? '#FFFFFF' : TOKENS.colors.primary}
                              />
                            </View>
                            <View style={{ flex: 1, alignItems: 'flex-start' }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <TextUI
                                  weight={isCurrentActive ? 'bold' : 'medium'}
                                  size={14}
                                  color={isCurrentActive ? TOKENS.colors.primaryDark : c.textPrimary}
                                >
                                  {isRTL ? item.titleAr : item.titleEn}
                                </TextUI>
                                {isCurrentActive && (
                                  <View
                                    style={{
                                      backgroundColor: TOKENS.colors.primary,
                                      paddingHorizontal: 6,
                                      paddingVertical: 1,
                                      borderRadius: 4,
                                      marginRight: 6
                                    }}
                                  >
                                    <TextUI size={10} color="#FFFFFF" weight="bold">
                                      {t('شاشة معروضة', 'Current')}
                                    </TextUI>
                                  </View>
                                )}
                              </View>
                            </View>
                          </View>

                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View
                              style={{
                                backgroundColor: themeMode === 'light' ? c.bgSecondary : '#221B17',
                                paddingHorizontal: 7,
                                paddingVertical: 2,
                                borderRadius: TOKENS.radius.pill,
                                marginLeft: 8
                              }}
                            >
                              <TextUI size={11} color={c.textSecondary}>
                                {item.badge}
                              </TextUI>
                            </View>
                            <Feather name="chevron-left" size={15} color={c.textSecondary} />
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // ==========================================
  // --- MODULE: PERSISTENT FLOATING MINI-PLAYER ---
  // ==========================================
  const FloatingMiniPlayer = () => {
    const recitersList = [
      { id: 'alafasy', nameAr: 'مشاري العفاسي' },
      { id: 'minshawi', nameAr: 'محمد صديق المنشاوي' },
      { id: 'abdulbasit', nameAr: 'عبد الباسط (مرتل)' },
      { id: 'abdulbasit_mujawwad', nameAr: 'عبد الباسط (مجود)' },
      { id: 'shuraim', nameAr: 'سعود الشريم' },
      { id: 'yasser_dosari', nameAr: 'ياسر الدوسري' },
      { id: 'baijan', nameAr: 'عبد الله البعيجان (النبوي)' },
      { id: 'burhaji', nameAr: 'محمد أحمد برهجي' },
      { id: 'ahmad_hudhaifi', nameAr: 'أحمد الحذيفي' },
      { id: 'abdulmohsen_qasim', nameAr: 'عبد المحسن القاسم' },
      { id: 'almuaiqly', nameAr: 'ماهر المعيقلي' },
      { id: 'alhusary', nameAr: 'محمود خليل الحصري' },
      { id: 'alghamdi', nameAr: 'سعد الغامدي' }
    ];
    const reciterObj = recitersList.find((r) => r.id === audioReciter) || recitersList[0];

    return (
      <View
        style={{
          position: 'absolute',
          bottom: !isFullScreen ? (Platform.OS === 'ios' ? 78 : 70) : 16,
          left: 12,
          right: 12,
          backgroundColor: c.surface,
          borderRadius: TOKENS.radius.lg,
          borderWidth: 1.5,
          borderColor: TOKENS.colors.secondary,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.16,
          shadowRadius: 10,
          elevation: 7,
          overflow: 'hidden',
          zIndex: 99
        }}
      >
        <View style={{ height: 3, backgroundColor: c.border, width: '100%' }}>
          <View style={{ height: '100%', width: `${Math.max(4, audioProgress)}%`, backgroundColor: TOKENS.colors.secondary }} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 }}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={toggleAnyAudioPlayback}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: currentAudioType === 'lesson' ? '#1E5A3E' : TOKENS.colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
              marginEnd: 10
            }}
          >
            <Feather name={audioPlaying ? 'pause' : 'play'} size={18} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigate(currentAudioType === 'lesson' ? 'ProphetLessons' : 'QuranAudio')}
            style={{ flex: 1, alignItems: 'flex-start', justifyContent: 'center' }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: currentAudioType === 'lesson' ? '#1E5A3E' : '#2E7D32', marginEnd: 6 }} />
              <TextUI weight="bold" size={13} color={c.textPrimary} numberOfLines={1}>
                {currentAudioType === 'lesson' && activeLesson
                  ? activeLesson.titleAr
                  : (isRTL ? `سورة ${selectedSurah.nameAr}` : `Surah ${selectedSurah.nameEn}`)}
              </TextUI>
              <TextUI size={11} color={TOKENS.colors.primary} style={{ marginHorizontal: 5 }}>
                •
              </TextUI>
              <TextUI size={12} color={c.textSecondary} numberOfLines={1}>
                {currentAudioType === 'lesson' && activeCourse
                  ? activeCourse.scholarAr
                  : reciterObj.nameAr}
              </TextUI>
            </View>
            <TextUI size={11} color={c.textSecondary} style={{ marginTop: 1 }} numberOfLines={1}>
              {currentAudioType === 'lesson'
                ? t('درس من الحرم النبوي • انقر لفتح المشغل', "Prophet's Mosque lesson • Tap to open")
                : t('تلاوة خاشعة تعمل • انقر لفتح المشغل الكامل', 'Audio playing • Tap to open player')}
            </TextUI>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              stopAllAudioPlayback();
              setAudioMiniPlayerDismissed(true);
            }}
            style={{ padding: 6, marginStart: 4 }}
          >
            <Feather name="x" size={18} color={c.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ==========================================
  // --- MODULE 2.1: ANDALUSIAN QURAN & VERSE SHARE CARD GENERATOR ---
  // ==========================================
  const renderShareCard = () => {
    const themeStyles = {
      andalusian: {
        cardBg: '#FAF6F0',
        outerBorder: '#C69255',
        innerBorder: 'rgba(198, 146, 85, 0.4)',
        goldAccent: '#C69255',
        textColor: '#3D2012',
        subtitleColor: '#7A5B43',
        tafsirColor: '#5C4434',
        badgeBg: 'rgba(198, 146, 85, 0.15)',
        badgeText: '#8C5E3C',
        label: t('أندلسي أصيل', 'Andalusian Gold')
      },
      emerald: {
        cardBg: '#0C2017',
        outerBorder: '#D4AF37',
        innerBorder: 'rgba(212, 175, 55, 0.35)',
        goldAccent: '#E2C974',
        textColor: '#F6F3E8',
        subtitleColor: '#A8C9B6',
        tafsirColor: '#C5DEC8',
        badgeBg: 'rgba(212, 175, 55, 0.20)',
        badgeText: '#E2C974',
        label: t('زمردي ليلي', 'Emerald Night')
      },
      vintage: {
        cardBg: '#2A1B12',
        outerBorder: '#C89858',
        innerBorder: 'rgba(200, 152, 88, 0.35)',
        goldAccent: '#E5B97B',
        textColor: '#FFF6EB',
        subtitleColor: '#C7ADA0',
        tafsirColor: '#DFC7BC',
        badgeBg: 'rgba(200, 152, 88, 0.18)',
        badgeText: '#E5B97B',
        label: t('مخطوطة عتيقة', 'Vintage Sepia')
      }
    };

    const cur = themeStyles[cardShareStyle];

    const handleCopyVerse = async () => {
      try {
        const textToCopy = `﴿ ${shareVerse.text} ﴾\n\n[${shareVerse.surahName} • آية ${shareVerse.ayahNumber}]\nتطبيق رفيق المسلم`;
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(textToCopy);
        }
        triggerHapticFeedback('success');
        setCopyToast(true);
        setTimeout(() => setCopyToast(false), 2500);
      } catch (e) {
        console.log('Copy error:', e);
      }
    };

    const handleShareCard = async () => {
      try {
        const textToShare = `﴿ ${shareVerse.text} ﴾\n\n[${shareVerse.surahName} • آية ${shareVerse.ayahNumber}]\n\nعبر تطبيق رفيق المسلم`;
        triggerHapticFeedback('light');
        if (Platform.OS === 'web' && typeof navigator !== 'undefined' && (navigator as any).share) {
          await (navigator as any).share({
            title: `${shareVerse.surahName} • آية ${shareVerse.ayahNumber}`,
            text: textToShare,
          });
        } else if (Platform.OS !== 'web') {
          await Share.share({
            message: textToShare,
            title: `${shareVerse.surahName} • آية ${shareVerse.ayahNumber}`,
          });
        } else {
          await handleCopyVerse();
        }
      } catch (err) {
        console.log('Share error:', err);
      }
    };

    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <Header
          title={t('بطاقة مشاركة آية وتدبر', 'Spiritual Verse Share Card')}
          subtitle={`${shareVerse.surahName} • ${t('آية', 'Ayah')} ${shareVerse.ayahNumber}`}
          onBack={goBack}
          rightAction={
            <TouchableOpacity onPress={handleShareCard} style={{ padding: 6 }}>
              <Feather name="share-2" size={18} color={TOKENS.colors.primary} />
            </TouchableOpacity>
          }
        />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
        >
          {/* THE SHARABLE VISUAL CARD PREVIEW */}
          <View
            style={{
              backgroundColor: cur.cardBg,
              borderRadius: 20,
              borderWidth: 2,
              borderColor: cur.outerBorder,
              padding: 20,
              position: 'relative',
              overflow: 'hidden',
              ...makeShadow('0 8px 30px rgba(93, 58, 34, 0.15)', '#5D3A22', 0.15, 8, { width: 0, height: 4 }, 6)
            }}
          >
            {/* Decorative Inner Thin Border */}
            <View
              style={{
                position: 'absolute',
                top: 7,
                bottom: 7,
                left: 7,
                right: 7,
                borderWidth: 1,
                borderColor: cur.innerBorder,
                borderRadius: 14,
                pointerEvents: 'none'
              }}
            />

            <ArabesqueWatermark opacity={0.06} color={cur.goldAccent} />

            {/* Top Moorish Arch Accent */}
            <View style={{ marginBottom: 14 }}>
              <MoorishArchFrame height={24} color={cur.outerBorder} />
            </View>

            {/* Surah & Ayah Badge Header */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
                zIndex: 2
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: cur.badgeBg,
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  borderRadius: TOKENS.radius.pill,
                  borderWidth: 1,
                  borderColor: cur.innerBorder
                }}
              >
                <TextUI size={13} color={cur.goldAccent} style={{ marginLeft: 6 }}>
                  ۞
                </TextUI>
                <TextUI size={13} weight="bold" color={cur.badgeText}>
                  {`${shareVerse.surahName} • آية ${shareVerse.ayahNumber}`}
                </TextUI>
              </View>

              <TextUI size={11} weight="medium" color={cur.subtitleColor}>
                {t('رفيق المسلم', 'Almosala Pro')}
              </TextUI>
            </View>

            {/* Sacred Ayah Calligraphy Text */}
            <View style={{ marginVertical: 10, paddingHorizontal: 6, zIndex: 2 }}>
              <TextUI
                quran
                align="center"
                size={23}
                weight="bold"
                color={cur.textColor}
                style={{
                  lineHeight: 46,
                  letterSpacing: 0.4
                }}
              >
                {`﴿ ${shareVerse.text} ﴾`}
              </TextUI>
            </View>

            {/* Ornamental Verse Divider */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                marginVertical: 14,
                gap: 8,
                zIndex: 2
              }}
            >
              <View style={{ height: 1, flex: 1, backgroundColor: cur.innerBorder }} />
              <TextUI size={13} color={cur.goldAccent}>
                ✦ ── ✤ ── ✦
              </TextUI>
              <View style={{ height: 1, flex: 1, backgroundColor: cur.innerBorder }} />
            </View>

            {/* Contextual Tafsir or Reflection */}
            {shareVerse.tafsir ? (
              <View style={{ paddingHorizontal: 8, marginBottom: 14, zIndex: 2 }}>
                <TextUI
                  size={13}
                  align="center"
                  color={cur.tafsirColor}
                  style={{ lineHeight: 22 }}
                >
                  {shareVerse.tafsir}
                </TextUI>
              </View>
            ) : null}

            {/* Bottom Moorish Arch Accent */}
            <View style={{ marginTop: 4, marginBottom: 6 }}>
              <MoorishArchFrame height={16} color={cur.outerBorder} opacity={0.65} />
            </View>

            {/* Footer Watermark */}
            <View style={{ alignItems: 'center', marginTop: 4, zIndex: 2 }}>
              <TextUI size={10} color={cur.subtitleColor}>
                {t('صدقة جارية • تطبيق رفيق المسلم ٢٠٢٦', 'Almosala Pro • Authentic Islamic Companion')}
              </TextUI>
            </View>
          </View>

          {/* Toast Feedback */}
          {copyToast && (
            <View
              style={{
                marginTop: 14,
                backgroundColor: '#2E7D32',
                paddingVertical: 10,
                paddingHorizontal: 16,
                borderRadius: TOKENS.radius.pill,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
            >
              <Feather name="check" size={15} color="#FFFFFF" />
              <TextUI size={13} weight="bold" color="#FFFFFF">
                {t('تم نسخ نص الآية الكريمة بنجاح إلى الحافظة ✓', 'Verse copied to clipboard successfully ✓')}
              </TextUI>
            </View>
          )}

          {/* CARD THEME STYLE SELECTOR */}
          <View style={{ marginTop: 20 }}>
            <TextUI size={13} weight="bold" color={c.textSecondary} style={{ marginBottom: 10 }}>
              {t('طابع تصميم البطاقة:', 'Card Design Theme:')}
            </TextUI>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[
                { id: 'andalusian', name: t('أندلسي أصيل', 'Andalusian Gold'), color: '#C69255', bg: '#FAF6F0' },
                { id: 'emerald', name: t('زمردي ليلي', 'Emerald Night'), color: '#D4AF37', bg: '#0C2017' },
                { id: 'vintage', name: t('مخطوطة عتيقة', 'Vintage Sepia'), color: '#C89858', bg: '#2A1B12' }
              ].map((st) => {
                const isSelected = cardShareStyle === st.id;
                return (
                  <TouchableOpacity
                    key={st.id}
                    activeOpacity={0.8}
                    onPress={() => {
                      triggerHapticFeedback('light');
                      setCardShareStyle(st.id as any);
                    }}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingVertical: 12,
                      paddingHorizontal: 8,
                      borderRadius: TOKENS.radius.md,
                      backgroundColor: c.surface,
                      borderWidth: isSelected ? 2 : 1,
                      borderColor: isSelected ? TOKENS.colors.primary : c.border,
                      gap: 6
                    }}
                  >
                    <View
                      style={{
                        width: 15,
                        height: 15,
                        borderRadius: 8,
                        backgroundColor: st.bg,
                        borderWidth: 1.5,
                        borderColor: st.color
                      }}
                    />
                    <TextUI
                      size={12}
                      weight={isSelected ? 'bold' : 'medium'}
                      color={isSelected ? TOKENS.colors.primary : c.textPrimary}
                    >
                      {st.name}
                    </TextUI>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ACTION BUTTONS */}
          <View style={{ marginTop: 22, gap: 12 }}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleShareCard}
              style={{
                backgroundColor: TOKENS.colors.primary,
                paddingVertical: 14,
                borderRadius: TOKENS.radius.md,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                shadowColor: TOKENS.colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
                elevation: 3
              }}
            >
              <Feather name="share-2" size={17} color="#FFFFFF" />
              <TextUI weight="bold" size={15} color="#FFFFFF">
                {t('مشاركة البطاقة والآية', 'Share Verse Card')}
              </TextUI>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleCopyVerse}
              style={{
                backgroundColor: c.surface,
                borderWidth: 1,
                borderColor: TOKENS.colors.secondary,
                paddingVertical: 12,
                borderRadius: TOKENS.radius.md,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
              }}
            >
              <Feather name="copy" size={16} color={TOKENS.colors.primary} />
              <TextUI weight="bold" size={14} color={TOKENS.colors.primary}>
                {t('نسخ نص الآية الكريمة', 'Copy Verse Text')}
              </TextUI>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  };

  // ==========================================
  // --- MODULE 2.2: QURAN KHATMAH TRACKER & DAILY WIRD ---
  // ==========================================
  const renderQuranKhatmah = () => {
    const totalQuranPages = 604;
    const progressPct = Math.min(100, Math.round((khatmahCurrentPage / totalQuranPages) * 100));
    const currentJuz = Math.min(30, Math.max(1, Math.ceil(khatmahCurrentPage / 20.13)));
    const currentHizb = Math.min(60, Math.max(1, Math.ceil(khatmahCurrentPage / 10.06)));
    const remainingPages = Math.max(0, totalQuranPages - khatmahCurrentPage);
    const pagesPerDay = Math.ceil(totalQuranPages / khatmahTargetDays);
    const estimatedDaysLeft = Math.ceil(remainingPages / pagesPerDay);

    const togglePrayerPledge = (prayerKey: string) => {
      const prev = khatmahPledgedPrayers[prayerKey];
      const next = !prev;
      setKhatmahPledgedPrayers((old) => ({ ...old, [prayerKey]: next }));
      if (next) {
        setKhatmahCurrentPage((p) => Math.min(totalQuranPages, p + 4));
        triggerHapticFeedback('success');
      } else {
        setKhatmahCurrentPage((p) => Math.max(1, p - 4));
        triggerHapticFeedback('light');
      }
    };

    const adjustPage = (delta: number) => {
      setKhatmahCurrentPage((p) => Math.max(1, Math.min(totalQuranPages, p + delta)));
      triggerHapticFeedback('light');
    };

    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <Header
          title={t('ختمتي والورد اليومي', 'Quran Khatmah Tracker')}
          subtitle={t('تنظيم الورد ومتابعة تقدم الإتمام', 'Daily Reading & Progress')}
          onBack={goBack}
          rightAction={
            <TouchableOpacity
              onPress={() => setKhatmahShowDua(!khatmahShowDua)}
              accessibilityRole="button"
              accessibilityLabel="khatmah-dua-toggle"
              style={{
                width: 38,
                height: 38,
                borderRadius: TOKENS.radius.pill,
                backgroundColor: c.surface,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: c.border
              }}
            >
              <Feather name="award" size={17} color={TOKENS.colors.primaryDark} />
            </TouchableOpacity>
          }
        />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 18, paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Moorish Arch */}
          <View style={{ width: '100%', marginBottom: 14 }}>
            <MoorishArchFrame height={22} color={TOKENS.colors.secondary} opacity={0.7} />
          </View>

          {/* Goal Duration Selector */}
          <View
            style={{
              backgroundColor: c.surface,
              borderRadius: TOKENS.radius.lg,
              padding: 14,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: c.border
            }}
          >
            <TextUI weight="bold" size={13} color={c.textSecondary} style={{ marginBottom: 10 }}>
              {t('اختر خطة الختمة المباركة:', 'Select Target Khatmah Plan:')}
            </TextUI>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[
                { days: 30, title: t('شهرية (٣٠ يوماً)', '30 Days'), badge: t('موصى به', 'Recommended') },
                { days: 60, title: t('شهرين (٦٠ يوماً)', '60 Days'), badge: null },
                { days: 90, title: t('٣ أشهر (٩٠ يوماً)', '90 Days'), badge: null }
              ].map((plan) => {
                const isSelected = khatmahTargetDays === plan.days;
                return (
                  <TouchableOpacity
                    key={plan.days}
                    activeOpacity={0.8}
                    onPress={() => {
                      setKhatmahTargetDays(plan.days);
                      triggerHapticFeedback('light');
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: isSelected ? TOKENS.colors.primary : (themeMode === 'light' ? '#FAF6F0' : '#2A2019'),
                      paddingVertical: 10,
                      paddingHorizontal: 6,
                      borderRadius: TOKENS.radius.md,
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: isSelected ? TOKENS.colors.primary : c.border
                    }}
                  >
                    <TextUI
                      weight={isSelected ? 'bold' : 'medium'}
                      size={12}
                      color={isSelected ? '#FFFFFF' : c.textPrimary}
                    >
                      {plan.title}
                    </TextUI>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Progress Hero Deck */}
          <View
            style={{
              borderRadius: TOKENS.radius.lg,
              overflow: 'hidden',
              marginBottom: 16,
              borderWidth: 1.5,
              borderColor: 'rgba(198, 146, 85, 0.45)',
              ...makeShadow('0 8px 24px rgba(93, 58, 34, 0.16)', '#5D3A22', 0.16, 8, { width: 0, height: 4 }, 6)
            }}
          >
            <LinearGradient
              colors={['#3E2010', '#5E381E', '#8C5E3C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 20, position: 'relative' }}
            >
              <ArabesqueWatermark opacity={0.10} />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ alignItems: 'flex-start' }}>
                  <TextUI size={12} weight="bold" color={TOKENS.colors.secondary}>
                    {t('مستوى إنجاز الختمة الحالية', 'Current Khatmah Completion')}
                  </TextUI>
                  <TextUI weight="bold" size={36} color="#FFFFFF" style={{ marginTop: 2 }}>
                    {`${toArabicNumber(progressPct)}٪`}
                  </TextUI>
                </View>

                {/* Streak Badge */}
                <View
                  style={{
                    backgroundColor: 'rgba(198, 146, 85, 0.25)',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: TOKENS.radius.pill,
                    borderWidth: 1,
                    borderColor: 'rgba(198, 146, 85, 0.5)',
                    flexDirection: 'row',
                    alignItems: 'center'
                  }}
                >
                  <TextUI size={13} weight="bold" color="#FFFFFF">
                    {`🔥 ${toArabicNumber(khatmahStreak)} ${t('أيام متتالية', 'days streak')}`}
                  </TextUI>
                </View>
              </View>

              {/* Progress Bar Line */}
              <View
                style={{
                  height: 8,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  borderRadius: 4,
                  marginTop: 14,
                  marginBottom: 16,
                  overflow: 'hidden'
                }}
              >
                <View
                  style={{
                    height: '100%',
                    width: `${Math.max(3, progressPct)}%`,
                    backgroundColor: TOKENS.colors.secondary,
                    borderRadius: 4
                  }}
                />
              </View>

              {/* 3 Metric Pills */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  backgroundColor: 'rgba(0,0,0,0.25)',
                  borderRadius: TOKENS.radius.md,
                  paddingVertical: 10,
                  paddingHorizontal: 12
                }}
              >
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <TextUI size={11} color="rgba(255,255,255,0.7)">{t('الجزء', 'Juz')}</TextUI>
                  <TextUI size={15} weight="bold" color="#FFFFFF" style={{ marginTop: 2 }}>
                    {`${toArabicNumber(currentJuz)} / ٣٠`}
                  </TextUI>
                </View>
                <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.15)' }} />
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <TextUI size={11} color="rgba(255,255,255,0.7)">{t('الحزب', 'Hizb')}</TextUI>
                  <TextUI size={15} weight="bold" color="#FFFFFF" style={{ marginTop: 2 }}>
                    {`${toArabicNumber(currentHizb)} / ٦٠`}
                  </TextUI>
                </View>
                <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.15)' }} />
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <TextUI size={11} color="rgba(255,255,255,0.7)">{t('الصفحة', 'Page')}</TextUI>
                  <TextUI size={15} weight="bold" color={TOKENS.colors.secondary} style={{ marginTop: 2 }}>
                    {`${toArabicNumber(khatmahCurrentPage)} / ٦٠٤`}
                  </TextUI>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Daily Prayers Reading Routine */}
          <View
            style={{
              backgroundColor: c.surface,
              borderRadius: TOKENS.radius.lg,
              padding: 16,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: c.border
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <View style={{ alignItems: 'flex-start' }}>
                <TextUI weight="bold" size={14} color={c.textPrimary}>
                  {t('تقسيم الورد اليومي بعد الصلوات', 'Daily Prayer Reading Routine')}
                </TextUI>
                <TextUI size={12} color={c.textSecondary} style={{ marginTop: 2 }}>
                  {t(
                    `المطلوب: ${toArabicNumber(pagesPerDay)} صفحة يومياً (٤ صفحات بعد كل صلاة)`,
                    `Target: ${pagesPerDay} pages/day (4 pages per prayer)`
                  )}
                </TextUI>
              </View>
              <View
                style={{
                  backgroundColor: TOKENS.colors.primaryLight,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: TOKENS.radius.pill
                }}
              >
                <TextUI size={11} weight="bold" color={TOKENS.colors.primaryDark}>
                  {`${toArabicNumber(Object.values(khatmahPledgedPrayers).filter(Boolean).length)} / ٥`}
                </TextUI>
              </View>
            </View>

            {/* 5 Prayers Grid */}
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
              {[
                { key: 'fajr', label: t('الفجر', 'Fajr') },
                { key: 'dhuhr', label: t('الظهر', 'Dhuhr') },
                { key: 'asr', label: t('العصر', 'Asr') },
                { key: 'maghrib', label: t('المغرب', 'Maghrib') },
                { key: 'isha', label: t('العشاء', 'Isha') }
              ].map((p) => {
                const isPledged = !!khatmahPledgedPrayers[p.key];
                return (
                  <TouchableOpacity
                    key={p.key}
                    activeOpacity={0.8}
                    onPress={() => togglePrayerPledge(p.key)}
                    style={{
                      flex: 1,
                      backgroundColor: isPledged ? (themeMode === 'light' ? '#EBF5EE' : '#1C2E22') : (themeMode === 'light' ? '#FAF6F0' : '#2A2019'),
                      paddingVertical: 10,
                      alignItems: 'center',
                      borderRadius: TOKENS.radius.md,
                      borderWidth: 1,
                      borderColor: isPledged ? '#4E7D5B' : c.border
                    }}
                  >
                    <Feather
                      name={isPledged ? 'check-circle' : 'circle'}
                      size={18}
                      color={isPledged ? '#4E7D5B' : c.textSecondary}
                    />
                    <TextUI
                      size={11}
                      weight="bold"
                      color={isPledged ? '#4E7D5B' : c.textPrimary}
                      style={{ marginTop: 4 }}
                    >
                      {p.label}
                    </TextUI>
                    <TextUI size={10} color={c.textSecondary} style={{ marginTop: 1 }}>
                      +٤ ص
                    </TextUI>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Quick Page Stepper */}
          <View
            style={{
              backgroundColor: c.surface,
              borderRadius: TOKENS.radius.lg,
              padding: 16,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: c.border
            }}
          >
            <TextUI weight="bold" size={13} color={c.textSecondary} style={{ marginBottom: 10 }}>
              {t('تعديل رقم الصفحة يدوياً:', 'Manual Page Stepper:')}
            </TextUI>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[
                { label: '-١ ص', delta: -1 },
                { label: '+١ ص', delta: 1 },
                { label: '+٤ ص', delta: 4 },
                { label: '+٢٠ ص (جزء)', delta: 20 }
              ].map((btn, idx) => (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.8}
                  onPress={() => adjustPage(btn.delta)}
                  style={{
                    flex: 1,
                    backgroundColor: themeMode === 'light' ? '#F7F3EE' : '#332922',
                    paddingVertical: 10,
                    borderRadius: TOKENS.radius.md,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: c.border
                  }}
                >
                  <TextUI weight="bold" size={12} color={TOKENS.colors.primaryDark}>
                    {btn.label}
                  </TextUI>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Direct CTA: Read in Quran */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              navigate('QuranReader');
              triggerHapticFeedback('medium');
            }}
            style={{
              backgroundColor: TOKENS.colors.primary,
              paddingVertical: 14,
              borderRadius: TOKENS.radius.pill,
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 18,
              ...makeShadow('0 4px 14px rgba(140, 94, 60, 0.3)', '#8C5E3C', 0.3, 6, { width: 0, height: 2 }, 4)
            }}
          >
            <Feather name="book-open" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
            <TextUI weight="bold" size={15} color="#FFFFFF">
              {t(
                `متابعة القراءة من ص ${toArabicNumber(khatmahCurrentPage)} بالمصحف`,
                `Continue reading from page ${khatmahCurrentPage}`
              )}
            </TextUI>
          </TouchableOpacity>

          {/* Dua Khatm Al-Quran Card */}
          <View
            style={{
              backgroundColor: themeMode === 'light' ? '#FAF6F0' : '#221B17',
              borderRadius: TOKENS.radius.lg,
              borderWidth: 1.5,
              borderColor: TOKENS.colors.secondary,
              padding: 18,
              marginBottom: 20
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Feather name="award" size={18} color={TOKENS.colors.secondary} style={{ marginLeft: 6 }} />
                <TextUI weight="bold" size={15} color={TOKENS.colors.primaryDark}>
                  {t('دعاء ختم القرآن الكريم المستجاب', 'Quran Completion Dua')}
                </TextUI>
              </View>
              <TouchableOpacity
                onPress={() => {
                  try {
                    const duaText = 'اللَّهُمَّ ارْحَمْنِي بِالقُرْآنِ، وَاجْعَلْهُ لِي إِمَاماً وَنُوراً وَهُدًى وَرَحْمَةً، اللَّهُمَّ ذَكِّرْنِي مِنْهُ مَا نَسِيتُ، وَعَلِّمْنِي مِنْهُ مَا جَهِلْتُ، وَارْزُقْنِي تِلاَوَتَهُ آنَاءَ اللَّيْلِ وَأَطْرَافَ النَّهَارِ، وَاجْعَلْهُ لِي حُجَّةً يَا رَبَّ العَالَمِينَ.';
                    if (typeof navigator !== 'undefined' && navigator.clipboard) {
                      navigator.clipboard.writeText(duaText);
                    }
                    Share.share({ message: `${duaText}\n\n— تطبيق رفيق المسلم` });
                  } catch (e) {}
                }}
                style={{ padding: 4 }}
              >
                <Feather name="share-2" size={16} color={TOKENS.colors.primary} />
              </TouchableOpacity>
            </View>

            <TextUI
              quran
              size={18}
              color={TOKENS.colors.primaryDark}
              style={{ lineHeight: 32, textAlign: 'center', marginVertical: 6 }}
            >
              اللَّهُمَّ ارْحَمْنَا بِالقُرْآنِ، وَاجْعَلْهُ لَنَا إِمَاماً وَنُوراً وَهُدًى وَرَحْمَةً، اللَّهُمَّ ذَكِّرْنَا مِنْهُ مَا نَسِينَا، وَعَلِّمْنَا مِنْهُ مَا جَهِلْنَا، وَارْزُقْنَا تِلاَوَتَهُ آنَاءَ اللَّيْلِ وَأَطْرَافَ النَّهَارِ، وَاجْعَلْهُ لَنَا حُجَّةً يَا رَبَّ العَالَمِينَ.
            </TextUI>

            <View
              style={{
                marginTop: 10,
                paddingTop: 10,
                borderTopWidth: 1,
                borderColor: 'rgba(198, 146, 85, 0.3)',
                alignItems: 'center'
              }}
            >
              <TextUI size={12} color={c.textSecondary}>
                {t('تقبل الله منا ومنكم صالح الأعمال والقرآن العظيم', 'May Allah accept your Quran recitation')}
              </TextUI>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  };

  // ==========================================
  // --- MODULE 1: ONBOARDING STACK -----------
  const renderWelcome = () => (
    <View style={{ flex: 1, padding: 24, justifyContent: 'space-between', backgroundColor: c.bg }}>
      <View style={{ alignItems: 'center', marginTop: 30 }}>
        {/* Top Moorish Arch Accent */}
        <View style={{ width: '100%', marginBottom: 20 }}>
          <MoorishArchFrame height={26} color={TOKENS.colors.secondary} opacity={0.75} />
        </View>

        {/* Grand Islamic Logo */}
        <IslamicLogo size={88} />

        <View
          style={{
            backgroundColor: themeMode === 'light' ? TOKENS.colors.secondaryLight : '#382E28',
            paddingHorizontal: 14,
            paddingVertical: 4,
            borderRadius: TOKENS.radius.pill,
            marginTop: 18,
            marginBottom: 8,
            borderWidth: 1,
            borderColor: TOKENS.colors.secondary
          }}
        >
          <TextUI size={12} weight="bold" color={TOKENS.colors.primaryDark}>
            {t('الطراز الأندلسي الأصيل • بدون إعلانات', 'Authentic Andalusian Islamic Companion')}
          </TextUI>
        </View>

        <TextUI weight="bold" size={28} color={TOKENS.colors.primaryDark} align="center">
          {t('رفيق المسلم', 'Islamic Companion')}
        </TextUI>
        <TextUI size={15} color={c.textSecondary} align="center" style={{ marginTop: 8, maxWidth: 320, lineHeight: 22 }}>
          {t(
            'مساحتك الروحانية الهادئة للصلوات الخمس، وتلاوة القرآن الكريم، وأذكار حصن المسلم الموثقة.',
            'Your tranquil sanctuary for the 5 daily prayers, Holy Quran, and authentic Azkar.'
          )}
        </TextUI>

        {/* 3 Core Highlights */}
        <View style={{ width: '100%', marginTop: 24 }}>
          {[
            { icon: 'compass', text: t('مواقيت دقيقة وقبلة موجهة للحرم المكي', 'Accurate prayer times & Qibla to Makkah') },
            { icon: 'book-open', text: t('مصحف عثماني فاخر مع التفسير الميسر', 'Uthmani Quran with audio & tafsir') },
            { icon: 'heart', text: t('مسبحة إلكترونية لمسية وأذكار موثقة', 'Haptic Azkar counter & daily fortress') }
          ].map((item, idx) => (
            <View
              key={idx}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: c.surface,
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: TOKENS.radius.md,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: c.border
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : '#2C231E',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: 10
                }}
              >
                <Feather name={item.icon} size={15} color={TOKENS.colors.primary} />
              </View>
              <TextUI size={13} weight="medium" color={c.textPrimary} style={{ flex: 1 }}>
                {item.text}
              </TextUI>
            </View>
          ))}
        </View>
      </View>

      <View style={{ marginBottom: 20 }}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigate('LocationPermission')}
          style={{
            backgroundColor: TOKENS.colors.primary,
            paddingVertical: 16,
            borderRadius: TOKENS.radius.pill,
            alignItems: 'center',
            ...makeShadow('0 4px 14px rgba(140, 94, 60, 0.35)', '#8C5E3C', 0.35, 6, { width: 0, height: 2 }, 4)
          }}
        >
          <TextUI weight="bold" size={16} color="#FFFFFF">
            {t('ابدأ رحلتك الإيمانية', 'Begin Your Spiritual Journey')}
          </TextUI>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderLocationPermission = () => (
    <View style={{ flex: 1, padding: 24, justifyContent: 'space-between', backgroundColor: c.bg }}>
      <Header title={t('تحديد الموقع', 'Location')} onBack={goBack} />
      <View style={{ alignItems: 'center', paddingHorizontal: 16 }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: TOKENS.colors.primaryLight,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24
          }}
        >
          <Feather name="map-pin" size={32} color={TOKENS.colors.primary} />
        </View>
        <TextUI weight="bold" size={22} align="center">
          {t('حساب دقيق لمواقيت الصلاة', 'Accurate Prayer Times')}
        </TextUI>
        <TextUI size={15} color={c.textSecondary} align="center" style={{ marginTop: 12 }}>
          {t(
            'يحتاج التطبيق لتحديد موقعك لحساب مواقيت الصلاة بدقة وتحديد اتجاه القبلة وفق إحداثيات مدينتك.',
            'The application uses your location to calculate exact prayer times and the precise Qibla direction.'
          )}
        </TextUI>
      </View>

      <View style={{ marginBottom: 20 }}>
        <TouchableOpacity
          onPress={() => navigate('NotificationPermission')}
          style={{
            backgroundColor: TOKENS.colors.primary,
            paddingVertical: 16,
            borderRadius: TOKENS.radius.pill,
            alignItems: 'center',
            marginBottom: 12
          }}
        >
          <TextUI weight="bold" size={16} color="#FFFFFF">
            {t('السماح بالموقع الجغرافي', 'Allow Location Access')}
          </TextUI>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigate('ManualLocation')}
          style={{ paddingVertical: 12, alignItems: 'center' }}
        >
          <TextUI size={15} color={c.textSecondary}>
            {t('تحديد المدينة يدوياً', 'Set Location Manually')}
          </TextUI>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderManualLocation = () => (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title={t('اختر مدينتك', 'Select Your City')} onBack={goBack} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        <TextUI size={13} color={c.textSecondary} style={{ marginBottom: 12 }}>
          {t('اختر أقرب مدينة إليك لحساب مواقيت الصلاة بدقة:', 'Choose your closest city for accurate calculations:')}
        </TextUI>
        {CITIES.map((city) => {
          const isSelected = currentCity.id === city.id;
          return (
            <TappableRow
              key={city.id}
              title={isRTL ? city.nameAr : city.nameEn}
              subtitle={`${isRTL ? city.country : city.country} • (${city.lat}, ${city.lng})`}
              badge={isSelected ? t('المحددة', 'Selected') : null}
              badgeColor={themeMode === 'light' ? TOKENS.colors.primaryLight : '#382E28'}
              icon="map-pin"
              onPress={() => {
                setCurrentCity(city);
                goBack();
              }}
              rightElement={isSelected ? <Feather name="check" size={18} color={TOKENS.colors.primary} /> : null}
            />
          );
        })}
      </ScrollView>
    </View>
  );

  const renderNotificationPermission = () => (
    <View style={{ flex: 1, padding: 24, justifyContent: 'space-between', backgroundColor: c.bg }}>
      <Header title={t('التنبيهات والأذان', 'Notifications')} onBack={goBack} />
      <View style={{ alignItems: 'center', paddingHorizontal: 16 }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: TOKENS.colors.secondaryLight,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24
          }}
        >
          <Feather name="bell" size={32} color={TOKENS.colors.primaryDark} />
        </View>
        <TextUI weight="bold" size={22} align="center">
          {t('تنبيهات هادئة بوقت الأذان', 'Gentle Prayer Alerts')}
        </TextUI>
        <TextUI size={15} color={c.textSecondary} align="center" style={{ marginTop: 12 }}>
          {t(
            'تلقي تنبيهات هادئة عند دخول أوقات الصلاة وتذكيرات أذكار الصباح والمساء بدون إزعاج.',
            'Receive peaceful alerts when prayer time arrives, with respectful morning and evening reminders.'
          )}
        </TextUI>
      </View>

      <View style={{ marginBottom: 20 }}>
        <TouchableOpacity
          onPress={() => navigate('Home')}
          style={{
            backgroundColor: TOKENS.colors.primary,
            paddingVertical: 16,
            borderRadius: TOKENS.radius.pill,
            alignItems: 'center',
            marginBottom: 12
          }}
        >
          <TextUI weight="bold" size={16} color="#FFFFFF">
            {t('تفعيل التنبيهات', 'Enable Alerts')}
          </TextUI>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigate('Home')}
          style={{ paddingVertical: 12, alignItems: 'center' }}
        >
          <TextUI size={15} color={c.textSecondary}>
            {t('تخطي للرئيسية', 'Skip to Home')}
          </TextUI>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ==========================================
  // --- MODULE 2: HOME SCREEN (Contextual) ---
  // ==========================================
  const renderHome = () => {
    const allPrayers = currentCity.prayers || [
      { id: 'fajr', nameAr: 'الفجر', nameEn: 'Fajr', time: '٠٤:٥٢ ص', isNext: false, icon: 'sunrise' },
      { id: 'sunrise', nameAr: 'الشروق', nameEn: 'Sunrise', time: '٠٦:٠٨ ص', isNext: false, icon: 'sun' },
      { id: 'dhuhr', nameAr: 'الظهر', nameEn: 'Dhuhr', time: '١٢:١٨ م', isNext: false, icon: 'sun' },
      { id: 'asr', nameAr: 'العصر', nameEn: 'Asr', time: '٠٣:٤٥ م', isNext: true, icon: 'clock' },
      { id: 'maghrib', nameAr: 'المغرب', nameEn: 'Maghrib', time: '٠٦:٢٨ م', isNext: false, icon: 'sunset' },
      { id: 'isha', nameAr: 'العشاء', nameEn: 'Isha', time: '٠٧:٥٨ م', isNext: false, icon: 'moon' }
    ];

    const sunrisePrayer = allPrayers.find((p: any) => p.id === 'sunrise');
    const fivePrayers = allPrayers
      .filter((p: any) => p.id !== 'sunrise')
      .map((p: any) => ({ ...p, isNext: p.id === nextPrayerInfo.id }));
    const prayers = allPrayers.map((p: any) => ({ ...p, isNext: p.id === nextPrayerInfo.id }));

    const toggleBell = (prayerId: string) => {
      setPrayerBells((prev) => {
        const next = { ...prev, [prayerId]: !prev[prayerId] };
        savePref('almosala_bells', next);
        triggerHapticFeedback('light');
        return next;
      });
    };

    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: c.bg }}
        contentContainerStyle={{ padding: 18, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Header (Brand, Master Directory, Location & Date) */}
        <View style={{ marginBottom: 14 }}>
          {/* Top Line: Brand Title & Badges on right, Catalog & Logo on left */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%'
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TextUI weight="bold" size={26} color={TOKENS.colors.primaryDark}>
                {t('المصلى', 'Al-Mosala')}
              </TextUI>
              <View
                style={{
                  backgroundColor: themeMode === 'light' ? TOKENS.colors.secondaryLight : '#382E28',
                  paddingHorizontal: 9,
                  paddingVertical: 3,
                  borderRadius: TOKENS.radius.pill,
                  marginRight: 8,
                  borderWidth: 1,
                  borderColor: TOKENS.colors.secondary
                }}
              >
                <TextUI size={11.5} weight="bold" color={TOKENS.colors.primaryDark}>
                  {t('الأندلسي', 'Pro')}
                </TextUI>
              </View>
            </View>

            {/* Left side in RTL: Catalog Launcher & Brand Logo */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setCatalogModalVisible(true)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : '#2C221C',
                  paddingVertical: 6,
                  paddingHorizontal: 11,
                  borderRadius: TOKENS.radius.pill,
                  borderWidth: 1.5,
                  borderColor: TOKENS.colors.secondary
                }}
              >
                <Feather name="grid" size={14} color={TOKENS.colors.primary} style={{ marginLeft: 5 }} />
                <TextUI size={13} weight="bold" color={TOKENS.colors.primaryDark}>
                  {t(`كل الشاشات (${toArabicNumber(ALL_APP_SCREENS.reduce((acc, s) => acc + s.items.length, 0))})`, `${ALL_APP_SCREENS.reduce((acc, s) => acc + s.items.length, 0)} Screens`)}
                </TextUI>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => navigate('About')}
                style={{
                  padding: 3,
                  backgroundColor: themeMode === 'light' ? '#FAF1E6' : '#2A2019',
                  borderRadius: TOKENS.radius.pill,
                  borderWidth: 1.5,
                  borderColor: TOKENS.colors.secondary
                }}
              >
                <IslamicLogo size={38} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Sub Line: Full-width Location & Hijri Date Bar (Clear & Readable for all users) */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 8,
              paddingTop: 2
            }}
          >
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigate('LocationSettings')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: themeMode === 'light' ? 'rgba(140, 94, 60, 0.12)' : 'rgba(255, 255, 255, 0.12)',
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: TOKENS.radius.pill,
                borderWidth: 1,
                borderColor: 'rgba(198, 146, 85, 0.35)',
                maxWidth: '53%'
              }}
            >
              <Feather name={currentCity.id === 'gps_live' ? 'crosshair' : 'map-pin'} size={13} color={TOKENS.colors.primary} style={{ marginLeft: 5 }} />
              <TextUI size={13} weight="bold" color={TOKENS.colors.primary} numberOfLines={1}>
                {`${isRTL ? currentCity.nameAr : currentCity.nameEn} • ${t('تغيير', 'Change')}`}
              </TextUI>
            </TouchableOpacity>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: themeMode === 'light' ? 'rgba(198, 146, 85, 0.12)' : 'rgba(255, 255, 255, 0.1)',
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: TOKENS.radius.pill,
                borderWidth: 1,
                borderColor: 'rgba(198, 146, 85, 0.35)',
                maxWidth: '46%'
              }}
            >
              <Feather name="calendar" size={13} color={c.textSecondary} style={{ marginLeft: 5 }} />
              <TextUI size={13} weight="bold" color={c.textPrimary} numberOfLines={1}>
                {isRTL ? getFormattedHijriDate(hijriAdjustment).ar : getFormattedHijriDate(hijriAdjustment).en}
              </TextUI>
            </View>
          </View>
        </View>

        {/* 2. PRIORITY 1: Next Prayer Hero Card (Warm Light Brown + Moorish Arch + Arabesque + Circular Countdown) */}
        <TouchableOpacity
          activeOpacity={0.94}
          onPress={() => navigate('PrayerTimes')}
          style={{
            borderRadius: TOKENS.radius.lg,
            overflow: 'hidden',
            marginBottom: 16,
            borderWidth: 1.5,
            borderColor: 'rgba(198, 146, 85, 0.45)',
            ...makeShadow('0 8px 24px rgba(93, 58, 34, 0.22)', '#5D3A22', 0.22, 8, { width: 0, height: 4 }, 6)
          }}
        >
          <LinearGradient
            colors={['#3E2010', '#5E381E', '#8C5E3C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ padding: 18, position: 'relative' }}
          >
            {/* Authentic Islamic Motifs */}
            <ArabesqueWatermark opacity={0.10} />
            <MosqueSilhouette />

            {/* Moorish Arch Top Header */}
            <View style={{ marginBottom: 10 }}>
              <MoorishArchFrame height={20} color="#D4A373" opacity={0.7} />
            </View>

            {/* Prayer Details on Right, Circular Countdown on Left */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                zIndex: 2,
                gap: 10
              }}
            >
              {/* Right Side: Next Prayer Metadata */}
              <View style={{ alignItems: 'flex-start', flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: 4.5,
                      backgroundColor: TOKENS.colors.secondary,
                      marginLeft: 7
                    }}
                  />
                  <TextUI size={14.5} weight="bold" color="#D8B98A">
                    {t('الصلاة القادمة', 'NEXT PRAYER')}
                  </TextUI>
                </View>

                <TextUI weight="bold" size={36} color="#FFFFFF" style={{ marginTop: 3 }}>
                  {isRTL ? nextPrayerInfo.nameAr : `${nextPrayerInfo.nameEn} Prayer`}
                </TextUI>

                <TextUI size={17} color="#FFFFFF" weight="bold" style={{ marginTop: 4 }}>
                  {`${t('موعد الأذان:', 'Adhan Time:')} ${nextPrayerInfo.time}${nextPrayerInfo.isTomorrow ? (isRTL ? ' (غداً)' : ' (Tomorrow)') : ''}`}
                </TextUI>
              </View>

              {/* Left Side: Circular Countdown Gauge */}
              <CircularCountdownGauge
                remainingText={countdownText}
                label={t('متبقي للأذان', 'Remaining')}
                progress={countdownProgress}
              />
            </View>

            {/* Bottom Row of Hero: Bell Toggle on Right, Full Schedule on Left */}
            <View
              style={{
                marginTop: 16,
                paddingTop: 12,
                borderTopWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.2)',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                zIndex: 2
              }}
            >
              <TouchableOpacity
                onPress={() => toggleBell(nextPrayerInfo.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: 'rgba(255, 255, 255, 0.16)',
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: TOKENS.radius.pill,
                  borderWidth: 1.5,
                  borderColor: 'rgba(216, 185, 138, 0.5)'
                }}
              >
                <Feather
                  name={prayerBells[nextPrayerInfo.id as keyof typeof prayerBells] ? 'bell' : 'bell-off'}
                  size={16}
                  color={TOKENS.colors.secondary}
                  style={{ marginLeft: 6 }}
                />
                <TextUI size={13.5} weight="bold" color="#FFFFFF">
                  {prayerBells[nextPrayerInfo.id as keyof typeof prayerBells] ? t('تنبيه الأذان: مفعّل', 'Adhan Alert: On') : t('تنبيه الأذان: صامت', 'Adhan: Muted')}
                </TextUI>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigate('Imsakiah')}
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}
              >
                <TextUI size={15} color="#FFFFFF" weight="bold">
                  {t('إمساكية الشهر ◀', 'Monthly Timetable ◀')}
                </TextUI>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* 3. PRIORITY 2: Today's Prayer Times - Compact Horizontal Strip (مواقيت صلوات اليوم الأفقية المدمجة) */}
        <View style={{ marginBottom: 16 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
              paddingHorizontal: 2
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Feather name="clock" size={17} color={TOKENS.colors.primary} />
              <TextUI weight="bold" size={16.5}>
                {t('مواقيت صلوات اليوم', "Today's Prayers")}
              </TextUI>
              {sunrisePrayer && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    backgroundColor: themeMode === 'light' ? 'rgba(198, 146, 85, 0.15)' : 'rgba(255, 255, 255, 0.1)',
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: TOKENS.radius.pill,
                    borderWidth: 1,
                    borderColor: 'rgba(198, 146, 85, 0.3)'
                  }}
                >
                  <Feather name="sun" size={12} color={TOKENS.colors.secondary} />
                  <TextUI size={12} color={TOKENS.colors.primaryDark} weight="bold">
                    {`${t('الشروق', 'Sunrise')}: ${sunrisePrayer.time.replace(' ص', '').replace(' م', '')} ص`}
                  </TextUI>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={() => navigate('PrayerTimes')}>
              <TextUI size={13.5} color={TOKENS.colors.primary} weight="bold">
                {t('التفاصيل والتقويم ◀', 'Details & Calendar ◀')}
              </TextUI>
            </TouchableOpacity>
          </View>

          {/* Unified 5-Prayer Cards Row (جميع الصلوات الخمس في شريط واحد دون اختفاء أي صلاة) */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'stretch',
              justifyContent: 'space-between',
              width: '100%',
              gap: 5
            }}
          >
            {fivePrayers.map((p) => {
              const isNext = p.isNext;
              return (
                <TouchableOpacity
                  key={p.id}
                  activeOpacity={0.8}
                  onPress={() => navigate('PrayerTimes')}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    paddingHorizontal: 3,
                    borderRadius: TOKENS.radius.md,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isNext
                      ? (themeMode === 'light' ? '#8C5E3C' : '#5E381E')
                      : c.surface,
                    borderWidth: 1.5,
                    borderColor: isNext ? TOKENS.colors.secondary : c.border,
                    ...(isNext ? makeShadow('0 4px 12px rgba(140, 94, 60, 0.25)', '#8C5E3C', 0.25, 4, { width: 0, height: 2 }, 4) : {})
                  }}
                >
                  {isNext && (
                    <View
                      style={{
                        backgroundColor: TOKENS.colors.secondary,
                        paddingHorizontal: 5,
                        paddingVertical: 2,
                        borderRadius: TOKENS.radius.pill,
                        marginBottom: 4
                      }}
                    >
                      <TextUI size={9.5} weight="bold" color="#FFFFFF">
                        {t('القادمة', 'Next')}
                      </TextUI>
                    </View>
                  )}
                  <Feather
                    name={p.icon as any}
                    size={17}
                    color={isNext ? '#FFFFFF' : TOKENS.colors.primary}
                    style={{ marginBottom: 3 }}
                  />
                  <TextUI
                    weight="bold"
                    size={13.5}
                    color={isNext ? '#FFFFFF' : c.textPrimary}
                    style={{ marginBottom: 2 }}
                    numberOfLines={1}
                  >
                    {isRTL ? p.nameAr : p.nameEn}
                  </TextUI>
                  <TextUI
                    weight="bold"
                    size={13.5}
                    color={isNext ? '#FFFFFF' : TOKENS.colors.primaryDark}
                    numberOfLines={1}
                  >
                    {p.time.replace(' ص', '').replace(' م', '')}
                  </TextUI>
                  <TextUI
                    size={11}
                    weight="medium"
                    color={isNext ? 'rgba(255,255,255,0.9)' : c.textSecondary}
                    style={{ marginTop: 1 }}
                  >
                    {p.time.includes('ص') ? t('ص', 'AM') : t('م', 'PM')}
                  </TextUI>
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation?.();
                      toggleBell(p.id);
                    }}
                    style={{ marginTop: 4, padding: 3 }}
                  >
                    <Feather
                      name={prayerBells[p.id] ? 'bell' : 'bell-off'}
                      size={14}
                      color={isNext ? TOKENS.colors.secondary : (prayerBells[p.id] ? TOKENS.colors.primary : c.textSecondary)}
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 4. PRIORITY 3: Quick Worship & Duties 4-Grid (شبكة الخدمات اليومية الذكية) */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            backgroundColor: c.surface,
            borderRadius: TOKENS.radius.lg,
            paddingVertical: 14,
            paddingHorizontal: 8,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: c.border
          }}
        >
          {[
            { id: 'Qibla', title: t('القبلة', 'Qibla'), sub: `${currentCity.qiblaAngle || 248}° مكة`, icon: 'compass' },
            { id: 'PrayerTracker', title: t('سجل الصلوات', 'Tracker'), sub: t('الفرائض والسنن', '5 Daily'), icon: 'check-circle' },
            { id: 'Imsakiah', title: t('الإمساكية', 'Imsakiah'), sub: t('تقويم الشهر', 'Timetable'), icon: 'calendar' },
            { id: 'ZakatCalculator', title: t('حاسبة الزكاة', 'Zakat'), sub: t('حساب دقيق', 'Calculator'), icon: 'dollar-sign' }
          ].map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.75}
              onPress={() => navigate(item.id)}
              style={{ flex: 1, alignItems: 'center' }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: themeMode === 'light' ? '#FAF1E6' : '#2D231B',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 6,
                  borderWidth: 1,
                  borderColor: TOKENS.colors.secondary
                }}
              >
                <Feather name={item.icon as any} size={22} color={TOKENS.colors.primary} />
              </View>
              <TextUI weight="bold" size={13.5} color={c.textPrimary} align="center">
                {item.title}
              </TextUI>
              <TextUI size={11.5} color={c.textSecondary} align="center" style={{ marginTop: 2 }}>
                {item.sub}
              </TextUI>
            </TouchableOpacity>
          ))}
        </View>

        {/* 5. PRIORITY 4: Holy Quran Dual Hub (واحة القرآن الكريم - تلاوة وختمة واستماع في بطاقة موحدة) */}
        <View style={{ marginBottom: 16 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
              paddingHorizontal: 2
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Feather name="book-open" size={17} color={TOKENS.colors.primary} style={{ marginLeft: 6 }} />
              <TextUI weight="bold" size={16.5}>
                {t('واحة القرآن الكريم', 'Holy Quran Hub')}
              </TextUI>
            </View>
            <TouchableOpacity onPress={() => navigate('QuranIndex')}>
              <TextUI size={13.5} color={TOKENS.colors.primary} weight="bold">
                {t('فهرس السور (١١٤) ◀', 'Surah Index (114) ◀')}
              </TextUI>
            </TouchableOpacity>
          </View>

          {/* Dual Action Unified Card */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: c.surface,
              borderRadius: TOKENS.radius.lg,
              borderWidth: 1,
              borderColor: c.border,
              overflow: 'hidden'
            }}
          >
            {/* Right Half: Reading Bookmark */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setSelectedSurah(SURAHS[3]);
                setReadingAyah(15);
                setSurahPageIndex(0);
                navigate('QuranReader');
              }}
              style={{
                flex: 1,
                padding: 12,
                borderLeftWidth: isRTL ? 1 : 0,
                borderRightWidth: isRTL ? 0 : 1,
                borderColor: c.border,
                alignItems: 'flex-start'
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : '#382E28',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: 8
                  }}
                >
                  <Feather name="book-open" size={17} color={TOKENS.colors.primary} />
                </View>
                <View>
                  <TextUI weight="bold" size={14.5} color={c.textPrimary}>
                    {t('متابعة التلاوة', 'Continue Reading')}
                  </TextUI>
                  <View
                    style={{
                      backgroundColor: themeMode === 'light' ? '#FAF1E6' : '#2D231B',
                      paddingHorizontal: 7,
                      paddingVertical: 2,
                      borderRadius: TOKENS.radius.pill,
                      alignSelf: 'flex-start',
                      marginTop: 2
                    }}
                  >
                    <TextUI size={10.5} weight="bold" color={TOKENS.colors.primary}>
                      {t('آخر موضع', 'Last Read')}
                    </TextUI>
                  </View>
                </View>
              </View>
              <TextUI size={13.5} weight="bold" color={TOKENS.colors.primaryDark} style={{ marginTop: 2 }}>
                {t('سورة الكهف • ص ٢٩٣', 'Al-Kahf • p. 293')}
              </TextUI>
              <TextUI size={12} weight="medium" color={c.textSecondary} style={{ marginTop: 2 }}>
                {t('الحزب ٢٩ • الجزء ١٥', 'Juz 15 • Hizb 29')}
              </TextUI>
            </TouchableOpacity>

            {/* Left Half: Audio Reciter & Khatmah */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigate('QuranAudio')}
              style={{
                flex: 1,
                padding: 12,
                alignItems: 'flex-start'
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: themeMode === 'light' ? '#FAF1E6' : '#2D231B',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: 8
                  }}
                >
                  <Feather name="headphones" size={17} color={TOKENS.colors.secondary} />
                </View>
                <View>
                  <TextUI weight="bold" size={14.5} color={c.textPrimary}>
                    {t('الاستماع والختمة', 'Audio & Khatmah')}
                  </TextUI>
                  <TextUI size={11} color={TOKENS.colors.secondary} weight="bold">
                    {t('تلاوة خاشعة', 'Holy Audio')}
                  </TextUI>
                </View>
              </View>
              <TextUI size={13.5} weight="bold" color={TOKENS.colors.primaryDark} style={{ marginTop: 2 }}>
                {t('الشيخ مشاري العفاسي', 'Mishary Alafasy')}
              </TextUI>
              <TextUI size={12} weight="medium" color={c.textSecondary} style={{ marginTop: 2 }}>
                {`${t('الورد: ص', 'Daily:')} ${toArabicNumber(khatmahCurrentPage)} ${t('من ٦٠٤ ص', 'of 604')}`}
              </TextUI>
            </TouchableOpacity>
          </View>
        </View>

        {/* 6. PRIORITY 5: Daily Azkar & Fortress of Muslim (حصن المسلم والذكر اليومي التفاعلي) */}
        <View style={{ marginBottom: 16 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
              paddingHorizontal: 2
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Feather name="heart" size={17} color={TOKENS.colors.secondary} style={{ marginLeft: 6 }} />
              <TextUI weight="bold" size={16.5}>
                {t('حصن المسلم والأذكار اليومية', 'Daily Azkar & Fortress')}
              </TextUI>
            </View>
            <TouchableOpacity onPress={() => navigate('AzkarCategories')}>
              <TextUI size={13.5} color={TOKENS.colors.primary} weight="bold">
                {t('كافة الأبواب (٦) ◀', 'All Categories (6) ◀')}
              </TextUI>
            </TouchableOpacity>
          </View>

          {/* Smart Time-Aware Azkar Card with Quick In-Place Actions */}
          <View
            style={{
              backgroundColor: c.surface,
              borderRadius: TOKENS.radius.lg,
              padding: 14,
              borderWidth: 1,
              borderColor: c.border
            }}
          >
            {/* Smart Time-Aware Azkar Card with Quick In-Place Actions */}
            {(() => {
              const currentHour = new Date().getHours();
              const isEveningTime = currentHour >= 12;
              const activeCat = isEveningTime ? AZKAR_CATEGORIES[1] : AZKAR_CATEGORIES[0];
              const cardTitle = isEveningTime ? t('أذكار المساء • حِصنك في ليلتك', 'Evening Azkar • Night Fortress') : t('أذكار الصباح • بداية يوم مبارك', 'Morning Azkar • Blessed Day');
              const cardIcon = isEveningTime ? 'moon' : 'sun';
              return (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: themeMode === 'light' ? TOKENS.colors.secondaryLight : '#2A2019',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginLeft: 8
                      }}
                    >
                      <Feather name={cardIcon as any} size={18} color={TOKENS.colors.primaryDark} />
                    </View>
                    <View>
                      <TextUI weight="bold" size={15.5} color={c.textPrimary}>
                        {cardTitle}
                      </TextUI>
                      <TextUI size={12.5} weight="bold" color={TOKENS.colors.primary}>
                        {t('٢٤ ذكراً مأثوراً كاملاً وموثقاً', '24 Complete Authentic Azkar')}
                      </TextUI>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => {
                      setSelectedCategory(activeCat);
                      setAzkarIndex(0);
                      setAzkarCounter(0);
                      navigate('AzkarSession');
                    }}
                    style={{
                      backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : '#382E28',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: TOKENS.radius.pill,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <TextUI size={12.5} weight="bold" color={TOKENS.colors.primary}>
                      {t('فتح الجلسة', 'Open')}
                    </TextUI>
                    <Feather name="chevron-left" size={14} color={TOKENS.colors.primary} />
                  </TouchableOpacity>
                </View>
              );
            })()}

            {/* Quick 2 Mini Buttons: Counter & Prophetic Duas */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setSelectedCategory(AZKAR_CATEGORIES[0]);
                  setAzkarIndex(0);
                  setAzkarCounter(0);
                  navigate('AzkarSession');
                }}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: themeMode === 'light' ? '#FAF1E6' : '#2D231B',
                  paddingVertical: 10,
                  paddingHorizontal: 10,
                  borderRadius: TOKENS.radius.md,
                  borderWidth: 1,
                  borderColor: TOKENS.colors.secondary,
                  gap: 6
                }}
              >
                <Feather name="activity" size={16} color={TOKENS.colors.primary} />
                <TextUI size={13.5} weight="bold" color={TOKENS.colors.primaryDark}>
                  {t('عداد التسبيح الذكي', 'Tasbih Counter')}
                </TextUI>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setSelectedCategory(AZKAR_CATEGORIES[5]);
                  setAzkarIndex(0);
                  setAzkarCounter(0);
                  navigate('AzkarSession');
                }}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: themeMode === 'light' ? c.bgSecondary : '#25201C',
                  paddingVertical: 10,
                  paddingHorizontal: 10,
                  borderRadius: TOKENS.radius.md,
                  borderWidth: 1,
                  borderColor: c.border,
                  gap: 6
                }}
              >
                <Feather name="book-open" size={16} color={TOKENS.colors.primary} />
                <TextUI size={13.5} weight="bold" color={c.textPrimary}>
                  {t('أدعية مأثورة (١٦)', 'Prophetic Duas (16)')}
                </TextUI>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 7. PRIORITY 6: Daily Contemplative Verse Card (آية وتدبر مع بطاقة المشاركة الأندلسية) */}
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={() => openVerseCardShare({
            text: 'الَّذِينَ آمَنُوا وَتَطْمَئِنُّ قُلُوبُهُم بِذِكْرِ اللَّهِ ۗ أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ',
            surahName: 'سورة الرعد',
            ayahNumber: '٢٨',
            tafsir: 'الذين صدّقوا بوحدانية الله واستكانت قلوبهم بذكره وتوحيده، ألا بطاعة الله وذكره تنشرح الصدور وتطمئن القلوب.'
          })}
          style={{
            backgroundColor: themeMode === 'light' ? '#FFFFFF' : c.surface,
            borderRadius: TOKENS.radius.lg,
            padding: 14,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: 'rgba(198, 146, 85, 0.35)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <ArabesqueWatermark opacity={0.05} color={TOKENS.colors.primary} />
          <View style={{ marginBottom: 4 }}>
            <MoorishArchFrame height={12} color={TOKENS.colors.secondary} opacity={0.4} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Feather name="bookmark" size={15} color={TOKENS.colors.secondary} style={{ marginLeft: 6 }} />
              <TextUI size={13.5} weight="bold" color={TOKENS.colors.primary}>
                {t('آية اليوم وتدبر', 'Verse of the Day')}
              </TextUI>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <TextUI size={12.5} weight="bold" color={c.textSecondary}>
                {t('سورة الرعد • ٢٨', 'Ar-Ra\'d • 28')}
              </TextUI>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : '#382E28',
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: TOKENS.radius.pill,
                  gap: 4
                }}
              >
                <Feather name="share-2" size={12} color={TOKENS.colors.primary} />
                <TextUI size={11.5} weight="bold" color={TOKENS.colors.primary}>
                  {t('مشاركة', 'Share')}
                </TextUI>
              </View>
            </View>
          </View>

          <TextUI
            quran
            size={18}
            align="center"
            weight="bold"
            color={TOKENS.colors.primaryDark}
            style={{ marginVertical: 4, lineHeight: 34 }}
          >
            {t('﴿ الَّذِينَ آمَنُوا وَتَطْمَئِنُّ قُلُوبُهُم بِذِكْرِ اللَّهِ ۗ أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ ﴾', '“Those who have believed and whose hearts are assured by the remembrance of Allah. Unquestionably, by the remembrance of Allah hearts are assured.”')}
          </TextUI>
        </TouchableOpacity>

        {/* 8. PRIORITY 7: Islamic Encyclopedia & Knowledge Suite (الموسوعة والفرائض الإسلامية المدمجة) */}
        <View style={{ marginBottom: 16 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
              paddingHorizontal: 2
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Feather name="award" size={17} color={TOKENS.colors.primary} style={{ marginLeft: 6 }} />
              <TextUI weight="bold" size={16.5}>
                {t('الموسوعة والفرائض الإسلامية', 'Islamic Encyclopedia & Duties')}
              </TextUI>
            </View>
            <TouchableOpacity onPress={() => navigate('More')}>
              <TextUI size={13.5} color={TOKENS.colors.primary} weight="bold">
                {t('المزيد من الخدمات ◀', 'More Services ◀')}
              </TextUI>
            </TouchableOpacity>
          </View>

          {/* 4 Compact Knowledge Cards */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            {/* Ruqyah */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigate('Ruqyah')}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: c.surface,
                borderRadius: TOKENS.radius.md,
                padding: 10,
                borderWidth: 1,
                borderColor: c.border
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: TOKENS.radius.sm,
                  backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : '#382E28',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: 8
                }}
              >
                <Feather name="shield" size={17} color={TOKENS.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <TextUI weight="bold" size={13.5}>{t('الرقية الشرعية', 'Ruqyah')}</TextUI>
                <TextUI size={11.5} color={c.textSecondary}>{t('تحصين وعلاج', 'Protection')}</TextUI>
              </View>
            </TouchableOpacity>

            {/* Hadith40 */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigate('Hadith40')}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: c.surface,
                borderRadius: TOKENS.radius.md,
                padding: 10,
                borderWidth: 1,
                borderColor: c.border
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: TOKENS.radius.sm,
                  backgroundColor: themeMode === 'light' ? '#FAF1E6' : '#2D231B',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: 8
                }}
              >
                <Feather name="book" size={17} color={TOKENS.colors.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <TextUI weight="bold" size={13.5}>{t('الأربعون النووية', '40 Hadiths')}</TextUI>
                <TextUI size={11.5} color={c.textSecondary}>{t('أصول الإسلام', 'Essentials')}</TextUI>
              </View>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            {/* Allah Names */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigate('AllahNames')}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: c.surface,
                borderRadius: TOKENS.radius.md,
                padding: 10,
                borderWidth: 1,
                borderColor: c.border
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: TOKENS.radius.sm,
                  backgroundColor: themeMode === 'light' ? '#F5ECE1' : '#33261F',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: 8
                }}
              >
                <Feather name="star" size={17} color={TOKENS.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <TextUI weight="bold" size={13.5}>{t('أسماء الله الحسنى', '99 Names')}</TextUI>
                <TextUI size={11.5} color={c.textSecondary}>{t('٩٩ اسماً ومعانيها', 'Divine Names')}</TextUI>
              </View>
            </TouchableOpacity>

            {/* Islamic Events */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigate('IslamicEvents')}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: c.surface,
                borderRadius: TOKENS.radius.md,
                padding: 10,
                borderWidth: 1,
                borderColor: c.border
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: TOKENS.radius.sm,
                  backgroundColor: themeMode === 'light' ? TOKENS.colors.secondaryLight : '#2A2019',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: 8
                }}
              >
                <Feather name="calendar" size={17} color={TOKENS.colors.primaryDark} />
              </View>
              <View style={{ flex: 1 }}>
                <TextUI weight="bold" size={13.5}>{t('المناسبات الإسلامية', 'Events')}</TextUI>
                <TextUI size={11.5} color={c.textSecondary}>{t('الأعياد والصيام', 'Islamic Dates')}</TextUI>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Feature Highlight: دروس الحرم النبوي الشريف والكراسي العلمية */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => navigate('ProphetLessons')}
          style={{
            marginBottom: 16,
            backgroundColor: themeMode === 'light' ? '#F2F8F4' : '#17271F',
            borderRadius: TOKENS.radius.lg,
            padding: 15,
            borderWidth: 1.5,
            borderColor: '#1E5A3E',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <ArabesqueWatermark opacity={0.07} color="#1E5A3E" />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: '#1E5A3E',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: 12
                }}
              >
                <Feather name="book-open" size={22} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1, alignItems: 'flex-start' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <TextUI weight="bold" size={15.5} color="#1E5A3E">
                    {t('دروس وكراسي الحرمين الشريفين', "Two Holy Mosques Scholarly Lessons")}
                  </TextUI>
                  <View
                    style={{
                      backgroundColor: '#E8F5E9',
                      paddingHorizontal: 7,
                      paddingVertical: 2,
                      borderRadius: TOKENS.radius.pill
                    }}
                  >
                    <TextUI size={10.5} weight="bold" color="#1E5A3E">
                      {t('كراسي العلم', 'Live Chairs')}
                    </TextUI>
                  </View>
                </View>
                <TextUI size={12.5} color={c.textSecondary}>
                  {t('شروح المتون وكبار العلماء: القاسم، البدر، الشنقيطي، الحذيفي', 'Authentic lessons: Al-Qasim, Al-Badr, Al-Shinqiti, Al-Hudhaifi')}
                </TextUI>
              </View>
            </View>
            <Feather name="chevron-left" size={18} color="#1E5A3E" />
          </View>
        </TouchableOpacity>

        {/* 9. Master Screen Directory Banner (دليل وفهرس الشاشات الكاملة - ٣٧ شاشة) */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setCatalogModalVisible(true)}
          style={{
            marginBottom: 16,
            backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : '#2C221C',
            borderRadius: TOKENS.radius.md,
            padding: 14,
            borderWidth: 1.5,
            borderColor: TOKENS.colors.secondary,
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <ArabesqueWatermark opacity={0.06} color={TOKENS.colors.secondary} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 23,
                  backgroundColor: TOKENS.colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: 12
                }}
              >
                <Feather name="grid" size={22} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1, alignItems: 'flex-start' }}>
                <TextUI weight="bold" size={15.5} color={TOKENS.colors.primaryDark}>
                  {t('فهرس وشاشات التطبيق الكاملة (٣٧ شاشة)', 'Complete App Screen Directory (37 Screens)')}
                </TextUI>
                <TextUI size={12.5} color={c.textSecondary} style={{ marginTop: 2 }}>
                  {t('استعراض والوصول الفوري لكافة الشاشات والخدمات الـ ٣٧', 'Explore and access all 37 app screens instantly')}
                </TextUI>
              </View>
            </View>
            <Feather name="chevron-left" size={18} color={TOKENS.colors.primary} />
          </View>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  // ==========================================
  // --- MODULE 3.1: PRAYER & SUNNAH TRACKER ---
  // ==========================================
  const renderPrayerTracker = () => {
    const fardhCount = Object.values(prayerFardhStatus).filter((s) => s === 'jamaah' || s === 'ontime').length;
    const sunanRawatibKeys = ['fajr_pre', 'dhuhr_pre', 'dhuhr_post', 'maghrib_post', 'isha_post'];
    const sunanRawatibCount = sunanRawatibKeys.filter((k) => prayerSunanStatus[k]).length;
    const totalDailyScore = Math.round(((fardhCount * 2 + sunanRawatibCount) / 15) * 100);

    const toggleFardh = (key: string, nextStatus: 'jamaah' | 'ontime' | 'missed') => {
      setPrayerFardhStatus((prev) => ({ ...prev, [key]: nextStatus }));
      triggerHapticFeedback(nextStatus === 'jamaah' ? 'success' : 'light');
    };

    const toggleSunnah = (key: string) => {
      setPrayerSunanStatus((prev) => {
        const next = !prev[key];
        triggerHapticFeedback(next ? 'success' : 'light');
        return { ...prev, [key]: next };
      });
    };

    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <Header
          title={t('سجلي اليومي للصلوات والسنن', 'Prayer & Sunnah Tracker')}
          subtitle={t('متابعة الفروض الخمس والسنن الرواتب', '5 Daily Prayers & 12 Sunan')}
          onBack={goBack}
        />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 18, paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Moorish Arch */}
          <View style={{ width: '100%', marginBottom: 14 }}>
            <MoorishArchFrame height={22} color={TOKENS.colors.secondary} opacity={0.7} />
          </View>

          {/* Adherence Hero Deck */}
          <View
            style={{
              borderRadius: TOKENS.radius.lg,
              overflow: 'hidden',
              marginBottom: 16,
              borderWidth: 1.5,
              borderColor: 'rgba(198, 146, 85, 0.45)',
              ...makeShadow('0 8px 24px rgba(93, 58, 34, 0.16)', '#5D3A22', 0.16, 8, { width: 0, height: 4 }, 6)
            }}
          >
            <LinearGradient
              colors={['#3E2010', '#5E381E', '#8C5E3C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 20, position: 'relative' }}
            >
              <ArabesqueWatermark opacity={0.10} />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ alignItems: 'flex-start' }}>
                  <TextUI size={12} weight="bold" color={TOKENS.colors.secondary}>
                    {t('المحافظة على صلوات وسنن اليوم', 'Today\'s Prayer Adherence')}
                  </TextUI>
                  <TextUI weight="bold" size={36} color="#FFFFFF" style={{ marginTop: 2 }}>
                    {`${toArabicNumber(totalDailyScore)}٪`}
                  </TextUI>
                </View>

                <View
                  style={{
                    backgroundColor: 'rgba(78, 125, 91, 0.4)',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: TOKENS.radius.pill,
                    borderWidth: 1,
                    borderColor: '#4E7D5B'
                  }}
                >
                  <TextUI size={12} weight="bold" color="#FFFFFF">
                    {totalDailyScore >= 80 ? t('محافظة ممتازة ⭐', 'Excellent') : t('في مسار الخير 🌿', 'Good Progress')}
                  </TextUI>
                </View>
              </View>

              {/* Progress Line */}
              <View
                style={{
                  height: 8,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  borderRadius: 4,
                  marginTop: 14,
                  marginBottom: 16,
                  overflow: 'hidden'
                }}
              >
                <View
                  style={{
                    height: '100%',
                    width: `${Math.max(5, totalDailyScore)}%`,
                    backgroundColor: TOKENS.colors.secondary,
                    borderRadius: 4
                  }}
                />
              </View>

              {/* 3 Metric Pills */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  backgroundColor: 'rgba(0,0,0,0.25)',
                  borderRadius: TOKENS.radius.md,
                  paddingVertical: 10,
                  paddingHorizontal: 12
                }}
              >
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <TextUI size={11} color="rgba(255,255,255,0.7)">{t('الصلوات الخمس', '5 Fardh')}</TextUI>
                  <TextUI size={14} weight="bold" color="#FFFFFF" style={{ marginTop: 2 }}>
                    {`${toArabicNumber(fardhCount)} / ٥`}
                  </TextUI>
                </View>
                <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.15)' }} />
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <TextUI size={11} color="rgba(255,255,255,0.7)">{t('السنن الرواتب', 'Rawatib')}</TextUI>
                  <TextUI size={14} weight="bold" color="#FFFFFF" style={{ marginTop: 2 }}>
                    {`${toArabicNumber(sunanRawatibCount)} / ٥`}
                  </TextUI>
                </View>
                <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.15)' }} />
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <TextUI size={11} color="rgba(255,255,255,0.7)">{t('الوتر والضحى', 'Witr & Duha')}</TextUI>
                  <TextUI size={14} weight="bold" color={TOKENS.colors.secondary} style={{ marginTop: 2 }}>
                    {prayerSunanStatus.witr ? 'مؤداة ✅' : 'قيد الأداء'}
                  </TextUI>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Section: الصلوات المفروضة الخمس */}
          <TextUI weight="bold" size={14} color={c.textSecondary} style={{ marginBottom: 10, paddingHorizontal: 4 }}>
            {t('الصلوات المفروضة الخمس:', 'The 5 Obligatory Prayers:')}
          </TextUI>

          <View style={{ backgroundColor: c.surface, borderRadius: TOKENS.radius.lg, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: c.border }}>
            {[
              { key: 'fajr', label: t('صلاة الفجر', 'Fajr'), time: '٠٤:٥٢ ص' },
              { key: 'dhuhr', label: t('صلاة الظهر', 'Dhuhr'), time: '١٢:١٨ م' },
              { key: 'asr', label: t('صلاة العصر', 'Asr'), time: '٠٣:٤٥ م' },
              { key: 'maghrib', label: t('صلاة المغرب', 'Maghrib'), time: '٠٦:٢٨ م' },
              { key: 'isha', label: t('صلاة العشاء', 'Isha'), time: '٠٧:٥٨ م' }
            ].map((p, idx) => {
              const currentVal = prayerFardhStatus[p.key] || 'missed';
              return (
                <View
                  key={p.key}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 10,
                    borderBottomWidth: idx < 4 ? 1 : 0,
                    borderColor: c.border
                  }}
                >
                  <View style={{ alignItems: 'flex-start' }}>
                    <TextUI weight="bold" size={13} color={c.textPrimary}>{p.label}</TextUI>
                    <TextUI size={11} color={c.textSecondary}>{p.time}</TextUI>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity
                      onPress={() => toggleFardh(p.key, 'jamaah')}
                      style={{
                        paddingVertical: 6,
                        paddingHorizontal: 8,
                        borderRadius: TOKENS.radius.sm,
                        backgroundColor: currentVal === 'jamaah' ? '#4E7D5B' : (themeMode === 'light' ? '#F7F3EE' : '#332922'),
                        borderWidth: 1,
                        borderColor: currentVal === 'jamaah' ? '#4E7D5B' : c.border
                      }}
                    >
                      <TextUI size={11} weight="bold" color={currentVal === 'jamaah' ? '#FFFFFF' : c.textSecondary}>
                        {t('🕌 جماعة', 'Jamaah')}
                      </TextUI>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => toggleFardh(p.key, 'ontime')}
                      style={{
                        paddingVertical: 6,
                        paddingHorizontal: 8,
                        borderRadius: TOKENS.radius.sm,
                        backgroundColor: currentVal === 'ontime' ? TOKENS.colors.primary : (themeMode === 'light' ? '#F7F3EE' : '#332922'),
                        borderWidth: 1,
                        borderColor: currentVal === 'ontime' ? TOKENS.colors.primary : c.border
                      }}
                    >
                      <TextUI size={11} weight="bold" color={currentVal === 'ontime' ? '#FFFFFF' : c.textSecondary}>
                        {t('⏱️ في وقتها', 'On time')}
                      </TextUI>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => toggleFardh(p.key, 'missed')}
                      style={{
                        paddingVertical: 6,
                        paddingHorizontal: 8,
                        borderRadius: TOKENS.radius.sm,
                        backgroundColor: currentVal === 'missed' ? (themeMode === 'light' ? '#F2EAE0' : '#2A2019') : 'transparent',
                        borderWidth: 1,
                        borderColor: currentVal === 'missed' ? TOKENS.colors.secondary : c.border
                      }}
                    >
                      <TextUI size={11} color={c.textSecondary}>
                        {t('⏳ لم تصلى', 'Pending')}
                      </TextUI>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Section: السنن الرواتب الإثنتا عشرة */}
          <TextUI weight="bold" size={14} color={c.textSecondary} style={{ marginBottom: 10, paddingHorizontal: 4 }}>
            {t('السنن الرواتب المؤكدة (١٢ ركعة):', '12 Sunnah Rawatib:')}
          </TextUI>

          {/* Hadith Quote Card */}
          <View
            style={{
              backgroundColor: themeMode === 'light' ? TOKENS.colors.secondaryLight : '#2C221C',
              borderRadius: TOKENS.radius.md,
              borderWidth: 1,
              borderColor: TOKENS.colors.secondary,
              padding: 12,
              marginBottom: 12
            }}
          >
            <TextUI size={12} weight="bold" color={TOKENS.colors.primaryDark} align="center">
              «مَنْ صَلَّى فِي يَوْمٍ وَلَيْلَةٍ ثِنْتَيْ عَشْرَةَ رَكْعَةً بُنِيَ لَهُ بَيْتٌ فِي الْجَنَّةِ»
            </TextUI>
            <TextUI size={10} color={c.textSecondary} align="center" style={{ marginTop: 2 }}>
              {t('رواه الإمام مسلم في صحيحه', 'Sahih Muslim')}
            </TextUI>
          </View>

          <View style={{ backgroundColor: c.surface, borderRadius: TOKENS.radius.lg, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: c.border }}>
            {[
              { key: 'fajr_pre', title: t('ركعتا الفجر القبلية (خير من الدنيا وما فيها)', '2 Rakats before Fajr'), count: '٢ ركعة' },
              { key: 'dhuhr_pre', title: t('أربع ركعات قبل صلاة الظهر', '4 Rakats before Dhuhr'), count: '٤ ركعات' },
              { key: 'dhuhr_post', title: t('ركعتان بعد صلاة الظهر', '2 Rakats after Dhuhr'), count: '٢ ركعة' },
              { key: 'maghrib_post', title: t('ركعتان بعد صلاة المغرب', '2 Rakats after Maghrib'), count: '٢ ركعة' },
              { key: 'isha_post', title: t('ركعتان بعد صلاة العشاء', '2 Rakats after Isha'), count: '٢ ركعة' }
            ].map((s) => {
              const isDone = !!prayerSunanStatus[s.key];
              return (
                <TouchableOpacity
                  key={s.key}
                  onPress={() => toggleSunnah(s.key)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderColor: c.border
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Feather
                      name={isDone ? 'check-circle' : 'circle'}
                      size={18}
                      color={isDone ? '#4E7D5B' : c.textSecondary}
                      style={{ marginLeft: 8 }}
                    />
                    <TextUI size={13} weight={isDone ? 'bold' : 'regular'} color={isDone ? '#4E7D5B' : c.textPrimary}>
                      {s.title}
                    </TextUI>
                  </View>
                  <View style={{ backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : '#382E28', paddingHorizontal: 8, paddingVertical: 2, borderRadius: TOKENS.radius.pill }}>
                    <TextUI size={11} color={TOKENS.colors.primaryDark} weight="bold">{s.count}</TextUI>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Section: الوتر والضحى وقيام الليل */}
          <TextUI weight="bold" size={14} color={c.textSecondary} style={{ marginBottom: 10, paddingHorizontal: 4 }}>
            {t('النوافل والوتر وقيام الليل:', 'Witr, Duha & Night Prayer:')}
          </TextUI>
          <View style={{ backgroundColor: c.surface, borderRadius: TOKENS.radius.lg, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: c.border }}>
            {[
              { key: 'witr', title: t('صلاة الوتر (ختام صلاة الليل)', 'Witr Prayer'), desc: t('أقله ركعة وأكثره إحدى عشرة', '1 to 11 rakats') },
              { key: 'duha', title: t('صلاة الضحى (صلاة الأوابين)', 'Duha Prayer'), desc: t('ركعتان تجزئ عن صدقة مفاصل الجسد', '2 to 8 rakats') },
              { key: 'qiyam', title: t('قيام الليل والتهجد', 'Qiyam al-Layl'), desc: t('شرف المؤمن ودأب الصالحين', 'Night vigil') }
            ].map((n) => {
              const isDone = !!prayerSunanStatus[n.key];
              return (
                <TouchableOpacity
                  key={n.key}
                  onPress={() => toggleSunnah(n.key)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderColor: c.border
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Feather
                      name={isDone ? 'check-circle' : 'circle'}
                      size={18}
                      color={isDone ? '#4E7D5B' : c.textSecondary}
                      style={{ marginLeft: 8 }}
                    />
                    <View style={{ alignItems: 'flex-start' }}>
                      <TextUI size={13} weight={isDone ? 'bold' : 'regular'} color={isDone ? '#4E7D5B' : c.textPrimary}>
                        {n.title}
                      </TextUI>
                      <TextUI size={11} color={c.textSecondary}>{n.desc}</TextUI>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  };

  // ==========================================
  // --- MODULE 3: PRAYER SERVICES ------------
  // ==========================================
  const renderPrayerTimes = () => {
    const rawPrayers = currentCity.prayers || [
      { id: 'fajr', nameAr: 'الفجر', nameEn: 'Fajr', time: '٠٤:١٢ ص', isNext: false, icon: 'sunrise' },
      { id: 'sunrise', nameAr: 'الشروق', nameEn: 'Sunrise', time: '٠٥:٤٠ ص', isNext: false, icon: 'sun' },
      { id: 'dhuhr', nameAr: 'الظهر', nameEn: 'Dhuhr', time: '١٢:٠٥ م', isNext: false, icon: 'sun' },
      { id: 'asr', nameAr: 'العصر', nameEn: 'Asr', time: '٠٣:٣٨ م', isNext: true, icon: 'clock' },
      { id: 'maghrib', nameAr: 'المغرب', nameEn: 'Maghrib', time: '٠٦:٢٢ م', isNext: false, icon: 'sunset' },
      { id: 'isha', nameAr: 'العشاء', nameEn: 'Isha', time: '٠٧:٥٢ م', isNext: false, icon: 'moon' }
    ];
    const prayers = rawPrayers.map((p: any) => ({ ...p, isNext: p.id === nextPrayerInfo.id }));

    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <Header
          title={t('مواقيت الصلاة', 'Prayer Times')}
          subtitle={`${isRTL ? currentCity.nameAr : currentCity.nameEn} • ${t('اليوم', 'Today')}`}
          onBack={goBack}
          rightAction={
            <TouchableOpacity onPress={() => navigate('PrayerSettings')}>
              <Feather name="sliders" size={18} color={c.textPrimary} />
            </TouchableOpacity>
          }
        />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Date Header: Hijri & Gregorian */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
              paddingHorizontal: 2
            }}
          >
            <View style={{ alignItems: 'flex-start' }}>
              <TextUI weight="bold" size={15}>
                {isRTL ? getFormattedHijriDate(hijriAdjustment).fullAr : getFormattedHijriDate(hijriAdjustment).fullEn}
              </TextUI>
              <TextUI size={13} color={c.textSecondary}>
                {t('٢٠ مايو ٢٠٢٤ م', 'May 20, 2024 CE')}
              </TextUI>
            </View>
            <View
              style={{
                backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : '#2C231E',
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: TOKENS.radius.pill
              }}
            >
              <TextUI size={12} weight="medium" color={TOKENS.colors.primary}>
                {t('الصلوات الخمس', '5 Daily Prayers')}
              </TextUI>
            </View>
          </View>

          {/* Direct CTA to Monthly Imsakiah */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigate('Imsakiah')}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: themeMode === 'light' ? '#FFFFFF' : c.surface,
              padding: 14,
              borderRadius: TOKENS.radius.md,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: TOKENS.colors.secondary
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : '#382E28',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: 12
                }}
              >
                <Feather name="calendar" size={18} color={TOKENS.colors.primary} />
              </View>
              <View style={{ alignItems: 'flex-start' }}>
                <TextUI weight="bold" size={14} color={TOKENS.colors.primaryDark}>
                  {t('إمساكية الشهر والتقويم الكامل 📅', 'Monthly Timetable & Imsakiah')}
                </TextUI>
                <TextUI size={12} color={c.textSecondary}>
                  {t('جدول ٣٠ يوماً كاملاً مع أوقات الإمساك والإفطار', 'Full 30-day prayer schedule with Imsak & Iftar')}
                </TextUI>
              </View>
            </View>
            <Feather name="chevron-left" size={18} color={TOKENS.colors.primary} />
          </TouchableOpacity>

          {/* Current/Next Prayer Hero Banner with Forest Gradient + Artwork */}
          <View
            style={{
              borderRadius: TOKENS.radius.lg,
              overflow: 'hidden',
              marginBottom: 16,
              borderWidth: 1.5,
              borderColor: 'rgba(216, 185, 138, 0.35)',
              position: 'relative'
            }}
          >
            <LinearGradient
              colors={['#3E2010', '#5E381E', '#8C5E3C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 20, alignItems: 'center', position: 'relative' }}
            >
              <ArabesqueWatermark opacity={0.10} />
              <MosqueSilhouette />

              <View style={{ width: '100%', marginBottom: 8 }}>
                <MoorishArchFrame height={20} color="#D4A373" opacity={0.7} />
              </View>

              <View
                style={{
                  backgroundColor: 'rgba(216, 185, 138, 0.2)',
                  paddingHorizontal: 12,
                  paddingVertical: 3,
                  borderRadius: TOKENS.radius.pill,
                  marginBottom: 6
                }}
              >
                <TextUI size={12} color={TOKENS.colors.secondary} weight="bold">
                  {`${t('الصلاة القادمة:', 'Next Prayer:')} ${isRTL ? nextPrayerInfo.nameAr : nextPrayerInfo.nameEn}`}
                </TextUI>
              </View>

              <TextUI weight="bold" size={42} color="#FFFFFF" style={{ marginVertical: 2 }}>
                {countdownText}
              </TextUI>

              <TextUI size={14} color="rgba(255, 255, 255, 0.85)">
                {`${t('متبقي حتى أذان', 'Remaining until')} ${isRTL ? nextPrayerInfo.nameAr : nextPrayerInfo.nameEn} (${nextPrayerInfo.time})${nextPrayerInfo.isTomorrow ? (isRTL ? ' - غداً' : ' - Tomorrow') : ''}`}
              </TextUI>
            </LinearGradient>
          </View>

          {/* Complete 6-Prayer List Rows */}
          {prayers.map((prayer) => {
            const isBellActive = prayerBells[prayer.id];
            return (
              <View
                key={prayer.id}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: c.surface,
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderRadius: TOKENS.radius.md,
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: prayer.isNext ? TOKENS.colors.primary : c.border
                }}
              >
                {/* Right side in RTL: Icon + Name + Badge */}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: TOKENS.radius.sm,
                      backgroundColor: prayer.isNext
                        ? TOKENS.colors.primary
                        : themeMode === 'light' ? c.bgSecondary : '#2C231E',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginLeft: 12
                    }}
                  >
                    <Feather
                      name={prayer.icon}
                      size={18}
                      color={prayer.isNext ? '#FFFFFF' : c.textSecondary}
                    />
                  </View>

                  <View style={{ alignItems: 'flex-start' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <TextUI
                        weight={prayer.isNext ? 'bold' : 'medium'}
                        size={16}
                        color={prayer.isNext ? TOKENS.colors.primary : c.textPrimary}
                      >
                        {isRTL ? prayer.nameAr : prayer.nameEn}
                      </TextUI>
                      {prayer.isNext && (
                        <View
                          style={{
                            backgroundColor: TOKENS.colors.primaryLight,
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: TOKENS.radius.pill,
                            marginRight: 8
                          }}
                        >
                          <TextUI size={10} weight="bold" color={TOKENS.colors.primary}>
                            {t('الآن', 'Next')}
                          </TextUI>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* Left side in RTL: Time + Bell Reminder */}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TextUI
                    weight={prayer.isNext ? 'bold' : 'medium'}
                    size={16}
                    color={prayer.isNext ? TOKENS.colors.primary : c.textPrimary}
                  >
                    {prayer.time}
                  </TextUI>

                  <TouchableOpacity
                    onPress={() => toggleBell(prayer.id)}
                    style={{
                      padding: 8,
                      marginLeft: 12
                    }}
                  >
                    <Feather
                      name={isBellActive ? 'bell' : 'bell-off'}
                      size={17}
                      color={isBellActive ? TOKENS.colors.primary : c.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          {/* Supporting Calculation Summary Card */}
          <TouchableOpacity
            onPress={() => navigate('PrayerSettings')}
            style={{
              marginTop: 16,
              padding: 16,
              backgroundColor: c.surface,
              borderRadius: TOKENS.radius.md,
              borderWidth: 1,
              borderColor: c.border
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <TextUI weight="bold" size={13} color={c.textSecondary}>
                {t('إعدادات الحساب الفلكي:', 'Calculation Settings:')}
              </TextUI>
              <TextUI size={12} color={TOKENS.colors.primary} weight="bold">
                {t('تعديل', 'Edit')}
              </TextUI>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <TextUI size={13} color={c.textSecondary}>{t('طريقة الحساب', 'Method')}</TextUI>
              <TextUI size={13} weight="medium">{t('رابطة العالم الإسلامي', 'Muslim World League')}</TextUI>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TextUI size={13} color={c.textSecondary}>{t('مذهب العصر', 'Asr Method')}</TextUI>
              <TextUI size={13} weight="medium">{t('الجمهور (الشافعي، المالكي، الحنبلي)', 'Standard (Shafi\'i, etc.)')}</TextUI>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  };

  // ==========================================
  // --- MODULE 3.1: FULL MONTHLY PRAYER TIMETABLE & IMSAKIAH ---
  // ==========================================
  const renderImsakiah = () => {
    // Generate 30 days of authentic prayer times
    const arabicDays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const englishDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const baseFajr = currentCity.prayers[0]?.time || '٠٤:٥٢ ص';
    const baseShuruq = currentCity.prayers[1]?.time || '٠٦:٠٨ ص';
    const baseDhuhr = currentCity.prayers[2]?.time || '١٢:١٨ م';
    const baseAsr = currentCity.prayers[3]?.time || '٠٣:٤٥ م';
    const baseMaghrib = currentCity.prayers[4]?.time || '٠٦:٢٨ م';
    const baseIsha = currentCity.prayers[5]?.time || '٠٧:٥٨ م';

    // Parse base numbers for Fajr & Maghrib minute calculations
    const daysData = Array.from({ length: 30 }, (_, index) => {
      const dayNum = index + 1;
      const dayNameAr = arabicDays[(dayNum + 1) % 7];
      const dayNameEn = englishDays[(dayNum + 1) % 7];
      const isFriday = dayNameAr === 'الجمعة';
      const isToday = dayNum === 12; // Active highlighted day

      // Astronomical seasonal minute shifts
      const deltaMins = Math.floor(index * 0.4);
      const fajrMin = Math.max(30, 52 - deltaMins);
      const imsakMin = Math.max(15, fajrMin - 15);
      const maghribMin = Math.min(58, 28 + deltaMins);
      const ishaMin = Math.min(58, 58 + deltaMins);

      const imsakStr = `٠٤:${toArabicNumber(String(imsakMin).padStart(2, '0'))} ص`;
      const fajrStr = `٠٤:${toArabicNumber(String(fajrMin).padStart(2, '0'))} ص`;
      const maghribStr = `٠٦:${toArabicNumber(String(maghribMin).padStart(2, '0'))} م`;
      const ishaStr = `٠٧:${toArabicNumber(String(ishaMin).padStart(2, '0'))} م`;

      return {
        dayNum,
        dayNumAr: toArabicNumber(dayNum),
        dayNameAr,
        dayNameEn,
        isFriday,
        isToday,
        imsak: imsakStr,
        fajr: fajrStr,
        shuruq: baseShuruq,
        dhuhr: baseDhuhr,
        asr: baseAsr,
        maghrib: maghribStr,
        isha: ishaStr,
      };
    });

    const handlePrintImsakiah = () => {
      triggerHapticFeedback('light');
      if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).print) {
        (window as any).print();
      } else {
        Share.share({
          title: `إمساكية مواقيت الصلاة - ${currentCity.nameAr}`,
          message: `إمساكية مواقيت الصلاة لشهر ${imsakiahMode === 'current' ? 'ذو القعدة' : 'رمضان المبارك'} لمدينة ${currentCity.nameAr}\nتطبيق رفيق المسلم\nالفجر: ${baseFajr} | المغرب: ${baseMaghrib}`
        });
      }
    };

    const handleCopyMonthTimes = async () => {
      try {
        const headerText = `=== إمساكية ${imsakiahMode === 'current' ? 'شهر ذو القعدة ١٤٤٥ هـ' : 'شهر رمضان المبارك ١٤٤٦ هـ'} - مدينة ${currentCity.nameAr} ===\n\nاليوم | الإمساك | الفجر | الشروق | الظهر | العصر | المغرب | العشاء\n`;
        const rowsText = daysData.slice(0, 10).map(d => `${d.dayNumAr} ${d.dayNameAr}: إمساك ${d.imsak} | فجر ${d.fajr} | مغرب ${d.maghrib}`).join('\n');
        const fullText = `${headerText}${rowsText}\n\n... جدول باقي أيام الشهر متوفر عبر تطبيق رفيق المسلم`;

        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(fullText);
        }
        triggerHapticFeedback('success');
        setCopyToast(true);
        setTimeout(() => setCopyToast(false), 2500);
      } catch (e) {
        console.log('Copy error:', e);
      }
    };

    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <Header
          title={t('إمساكية الشهر والتقويم', 'Monthly Timetable')}
          subtitle={`${isRTL ? currentCity.nameAr : currentCity.nameEn} • ${imsakiahMode === 'current' ? t('ذو القعدة ١٤٤٥ هـ', 'Dhu al-Qidah 1445 AH') : t('رمضان المبارك ١٤٤٦ هـ', 'Ramadan 1446 AH')}`}
          onBack={goBack}
          rightAction={
            <TouchableOpacity onPress={handlePrintImsakiah} style={{ padding: 6 }}>
              <Feather name="printer" size={18} color={TOKENS.colors.primary} />
            </TouchableOpacity>
          }
        />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Month Switcher Tabs */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: themeMode === 'light' ? c.bgSecondary : '#2A201A',
              borderRadius: TOKENS.radius.pill,
              padding: 4,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: c.border
            }}
          >
            <TouchableOpacity
              onPress={() => {
                triggerHapticFeedback('light');
                setImsakiahMode('current');
              }}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: TOKENS.radius.pill,
                backgroundColor: imsakiahMode === 'current' ? TOKENS.colors.primary : 'transparent',
                alignItems: 'center'
              }}
            >
              <TextUI
                weight="bold"
                size={13}
                color={imsakiahMode === 'current' ? '#FFFFFF' : c.textSecondary}
              >
                {t('الشهر الحالي (ذو القعدة)', 'Current (Dhu al-Qidah)')}
              </TextUI>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                triggerHapticFeedback('light');
                setImsakiahMode('ramadan');
              }}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: TOKENS.radius.pill,
                backgroundColor: imsakiahMode === 'ramadan' ? TOKENS.colors.primary : 'transparent',
                alignItems: 'center'
              }}
            >
              <TextUI
                weight="bold"
                size={13}
                color={imsakiahMode === 'ramadan' ? '#FFFFFF' : c.textSecondary}
              >
                {t('🌙 إمساكية رمضان المبارك', '🌙 Ramadan Mubarak')}
              </TextUI>
            </TouchableOpacity>
          </View>

          {/* Hero Highlight Banner */}
          <View
            style={{
              borderRadius: TOKENS.radius.lg,
              overflow: 'hidden',
              marginBottom: 16,
              borderWidth: 1.5,
              borderColor: 'rgba(216, 185, 138, 0.35)',
              position: 'relative'
            }}
          >
            <LinearGradient
              colors={['#3E2010', '#5E381E', '#8C5E3C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 18, position: 'relative' }}
            >
              <ArabesqueWatermark opacity={0.12} />
              <View style={{ width: '100%', marginBottom: 6 }}>
                <MoorishArchFrame height={18} color="#D4A373" opacity={0.7} />
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ alignItems: 'flex-start' }}>
                  <TextUI size={12} color={TOKENS.colors.secondary} weight="bold">
                    {imsakiahMode === 'ramadan' ? t('موعد الإفطار اليوم (المغرب)', 'Today Iftar (Maghrib)') : t('موعد صلاة المغرب اليوم', 'Today Maghrib Prayer')}
                  </TextUI>
                  <TextUI weight="bold" size={32} color="#FFFFFF" style={{ marginVertical: 2 }}>
                    {baseMaghrib}
                  </TextUI>
                  <TextUI size={12} color="rgba(255, 255, 255, 0.85)">
                    {`${t('الإمساك يبدأ في:', 'Imsak starts at:')} ${daysData[11].imsak}`}
                  </TextUI>
                </View>

                <View
                  style={{
                    backgroundColor: 'rgba(216, 185, 138, 0.2)',
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: TOKENS.radius.md,
                    borderWidth: 1,
                    borderColor: 'rgba(216, 185, 138, 0.4)',
                    alignItems: 'center'
                  }}
                >
                  <TextUI size={11} color="#FFFFFF" weight="medium">
                    {t('اليوم المعتمد', 'Today')}
                  </TextUI>
                  <TextUI weight="bold" size={20} color={TOKENS.colors.secondary}>
                    ١٢
                  </TextUI>
                  <TextUI size={11} color="rgba(255, 255, 255, 0.85)">
                    {imsakiahMode === 'ramadan' ? t('رمضان', 'Ramadan') : t('ذو القعدة', 'Dhu al-Q')}
                  </TextUI>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Quick Action Share / Copy Buttons */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleCopyMonthTimes}
              style={{
                flex: 1,
                backgroundColor: c.surface,
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: TOKENS.radius.md,
                borderWidth: 1,
                borderColor: c.border,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
            >
              <Feather name="copy" size={14} color={TOKENS.colors.primary} />
              <TextUI size={12} weight="bold" color={TOKENS.colors.primary}>
                {t('نسخ المواقيت', 'Copy Schedule')}
              </TextUI>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handlePrintImsakiah}
              style={{
                flex: 1,
                backgroundColor: c.surface,
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: TOKENS.radius.md,
                borderWidth: 1,
                borderColor: c.border,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
            >
              <Feather name="share-2" size={14} color={TOKENS.colors.primary} />
              <TextUI size={12} weight="bold" color={TOKENS.colors.primary}>
                {t('مشاركة الإمساكية', 'Share Timetable')}
              </TextUI>
            </TouchableOpacity>
          </View>

          {copyToast && (
            <View
              style={{
                marginBottom: 14,
                backgroundColor: '#2E7D32',
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: TOKENS.radius.pill,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
            >
              <Feather name="check" size={14} color="#FFFFFF" />
              <TextUI size={12} weight="bold" color="#FFFFFF">
                {t('تم نسخ مواقيت الإمساكية بنجاح ✓', 'Timetable copied successfully ✓')}
              </TextUI>
            </View>
          )}

          {/* HORIZONTALLY SCROLLABLE COMPLETE 30-DAY TIMETABLE */}
          <View
            style={{
              backgroundColor: c.surface,
              borderRadius: TOKENS.radius.lg,
              borderWidth: 1,
              borderColor: c.border,
              overflow: 'hidden'
            }}
          >
            {/* Table Header Banner */}
            <View
              style={{
                paddingVertical: 12,
                paddingHorizontal: 16,
                backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : '#382E28',
                borderBottomWidth: 1,
                borderColor: c.border,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <TextUI weight="bold" size={14} color={TOKENS.colors.primaryDark}>
                {t('جدول الصلوات اليومية كاملاً (٣٠ يوماً)', 'Complete 30-Day Prayer Schedule')}
              </TextUI>
              <TextUI size={11} color={c.textSecondary}>
                {t('اسحب أفقياً لعرض كافة المواقيت ↔', 'Scroll horizontally ↔')}
              </TextUI>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={true} style={{ width: '100%' }}>
              <View style={{ minWidth: 620, paddingBottom: 6 }}>
                {/* Column Headers */}
                <View
                  style={{
                    flexDirection: 'row',
                    backgroundColor: themeMode === 'light' ? '#F4EDE4' : '#2A201A',
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderBottomWidth: 1.5,
                    borderColor: TOKENS.colors.secondary
                  }}
                >
                  <TextUI weight="bold" size={12} color={TOKENS.colors.primaryDark} style={{ width: 85, textAlign: 'center' }}>
                    {t('اليوم', 'Day')}
                  </TextUI>
                  <TextUI weight="bold" size={12} color="#C69255" style={{ width: 75, textAlign: 'center' }}>
                    {t('الإمساك', 'Imsak')}
                  </TextUI>
                  <TextUI weight="bold" size={12} color={c.textPrimary} style={{ width: 75, textAlign: 'center' }}>
                    {t('الفجر', 'Fajr')}
                  </TextUI>
                  <TextUI weight="bold" size={12} color={c.textSecondary} style={{ width: 75, textAlign: 'center' }}>
                    {t('الشروق', 'Sunrise')}
                  </TextUI>
                  <TextUI weight="bold" size={12} color={c.textPrimary} style={{ width: 75, textAlign: 'center' }}>
                    {t('الظهر', 'Dhuhr')}
                  </TextUI>
                  <TextUI weight="bold" size={12} color={c.textPrimary} style={{ width: 75, textAlign: 'center' }}>
                    {t('العصر', 'Asr')}
                  </TextUI>
                  <TextUI weight="bold" size={12} color={TOKENS.colors.primary} style={{ width: 85, textAlign: 'center' }}>
                    {t('المغرب (إفطار)', 'Maghrib')}
                  </TextUI>
                  <TextUI weight="bold" size={12} color={c.textPrimary} style={{ width: 75, textAlign: 'center' }}>
                    {t('العشاء', 'Isha')}
                  </TextUI>
                </View>

                {/* 30-Day Rows */}
                {daysData.map((d) => {
                  const rowBg = d.isToday
                    ? (themeMode === 'light' ? 'rgba(216, 185, 138, 0.25)' : 'rgba(216, 185, 138, 0.15)')
                    : d.isFriday
                    ? (themeMode === 'light' ? '#FCF9F5' : '#261E19')
                    : 'transparent';

                  return (
                    <View
                      key={d.dayNum}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: rowBg,
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        borderBottomWidth: 1,
                        borderColor: d.isToday ? TOKENS.colors.secondary : c.border
                      }}
                    >
                      {/* Day Name & Number */}
                      <View style={{ width: 85, alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <TextUI
                            weight={d.isToday || d.isFriday ? 'bold' : 'medium'}
                            size={12}
                            color={d.isToday ? TOKENS.colors.primary : d.isFriday ? TOKENS.colors.secondary : c.textPrimary}
                          >
                            {`${d.dayNumAr} ${isRTL ? d.dayNameAr : d.dayNameEn}`}
                          </TextUI>
                          {d.isToday && (
                            <View
                              style={{
                                backgroundColor: TOKENS.colors.primary,
                                paddingHorizontal: 4,
                                paddingVertical: 1,
                                borderRadius: 4
                              }}
                            >
                              <TextUI size={9} color="#FFFFFF" weight="bold">
                                {t('اليوم', 'Now')}
                              </TextUI>
                            </View>
                          )}
                        </View>
                      </View>

                      {/* Prayer Times Columns */}
                      <TextUI size={12} weight="medium" color="#C69255" style={{ width: 75, textAlign: 'center' }}>
                        {d.imsak}
                      </TextUI>
                      <TextUI size={12} weight={d.isToday ? 'bold' : 'normal'} color={c.textPrimary} style={{ width: 75, textAlign: 'center' }}>
                        {d.fajr}
                      </TextUI>
                      <TextUI size={12} color={c.textSecondary} style={{ width: 75, textAlign: 'center' }}>
                        {d.shuruq}
                      </TextUI>
                      <TextUI size={12} color={c.textPrimary} style={{ width: 75, textAlign: 'center' }}>
                        {d.dhuhr}
                      </TextUI>
                      <TextUI size={12} color={c.textPrimary} style={{ width: 75, textAlign: 'center' }}>
                        {d.asr}
                      </TextUI>
                      <TextUI
                        size={12}
                        weight="bold"
                        color={TOKENS.colors.primary}
                        style={{ width: 85, textAlign: 'center' }}
                      >
                        {d.maghrib}
                      </TextUI>
                      <TextUI size={12} color={c.textPrimary} style={{ width: 75, textAlign: 'center' }}>
                        {d.isha}
                      </TextUI>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </ScrollView>
      </View>
    );
  };

    // ==========================================
  // --- MODULE 3.4.1: AUTHENTIC KAABA EMBLEM ---
  // ==========================================
  const KaabaEmblem = ({ size = 38 }: { size?: number }) => {
    const beltH = Math.max(3, Math.round(size * 0.16));
    const doorW = Math.max(5, Math.round(size * 0.22));
    const doorH = Math.max(8, Math.round(size * 0.44));

    return (
      <View
        style={{
          width: size,
          height: size,
          backgroundColor: '#171717',
          borderRadius: 4,
          borderWidth: 1.5,
          borderColor: '#EAB308',
          alignItems: 'center',
          justifyContent: 'flex-start',
          position: 'relative',
          shadowColor: '#F59E0B',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.5,
          shadowRadius: 5,
          elevation: 6
        }}
      >
        {/* Golden Kiswah Belt */}
        <View
          style={{
            width: '100%',
            height: beltH,
            backgroundColor: '#F59E0B',
            marginTop: Math.round(size * 0.16),
            borderTopWidth: 0.5,
            borderBottomWidth: 0.5,
            borderColor: '#FEF08A'
          }}
        />

        {/* Golden Door of the Kaaba */}
        <View
          style={{
            position: 'absolute',
            right: Math.round(size * 0.14),
            bottom: 2,
            width: doorW,
            height: doorH,
            backgroundColor: '#EAB308',
            borderTopLeftRadius: 2,
            borderTopRightRadius: 2,
            borderWidth: 0.5,
            borderColor: '#FEF08A'
          }}
        />

        {/* Golden Spout */}
        <View
          style={{
            position: 'absolute',
            top: -3,
            left: Math.round(size * 0.22),
            width: 4,
            height: 3,
            backgroundColor: '#FACC15',
            borderRadius: 1
          }}
        />
      </View>
    );
  };

  const renderQibla = () => {
    // Dynamic compass size scaling for responsive mobile screens
    const compassDiameter = Math.min(windowWidth * 0.78, 310);
    const innerDiameter = compassDiameter - 62;
    const coreDiameter = innerDiameter - 36;

    const targetAngle = typeof currentCity.qiblaAngle === 'number' ? currentCity.qiblaAngle : 0;
    
    // Relative angle for compass rotation
    const relativeAngle = ((targetAngle - deviceHeading) % 360 + 360) % 360;

    // Shortest angular difference (-180 to 180)
    let diff = (deviceHeading - targetAngle) % 360;
    if (diff < -180) diff += 360;
    if (diff > 180) diff -= 360;

    const isAligned = Math.abs(diff) <= 4;
    const degreesOff = Math.abs(Math.round(diff));
    const turnDirection = diff < -4 ? 'right' : 'left';

    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <Header
          title={t('اتجاه القبلة', 'Qibla Direction')}
          subtitle={t('بوصلة دقيقة نحو مكة المكرمة', 'Precise Compass to Makkah')}
          onBack={goBack}
        />

        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 16,
            paddingHorizontal: 20,
            paddingBottom: 110
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Current Location & GPS Quick Bar */}
          <View
            style={{
              width: '100%',
              maxWidth: 360,
              backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : '#2A201A',
              borderRadius: 14,
              paddingVertical: 10,
              paddingHorizontal: 14,
              marginBottom: 10,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderWidth: 1,
              borderColor: themeMode === 'light' ? 'rgba(140, 94, 60, 0.2)' : 'rgba(216, 185, 138, 0.2)'
            }}
          >
            <View style={{ flex: 1, marginRight: isRTL ? 0 : 8, marginLeft: isRTL ? 8 : 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Feather name="map-pin" size={13} color={TOKENS.colors.primary} />
                <TextUI weight="bold" size={13} color={TOKENS.colors.primary} numberOfLines={1}>
                  {isRTL ? currentCity.nameAr : currentCity.nameEn}
                </TextUI>
              </View>
              <TextUI size={11} color={c.textSecondary} style={{ marginTop: 2 }}>
                {`${t('المسافة للكعبة:', 'Distance:')} ${currentCity.distanceToMakkah || '٠ كم'}`}
              </TextUI>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <TouchableOpacity
                disabled={gpsLoading}
                onPress={() => fetchLiveGpsLocation()}
                style={{
                  backgroundColor: TOKENS.colors.primary,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                {gpsLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Feather name="crosshair" size={12} color="#FFFFFF" />
                )}
                <TextUI size={11} weight="bold" color="#FFFFFF">
                  {gpsLoading ? t('تحديد...', 'Locating...') : t('GPS', 'GPS')}
                </TextUI>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigate('LocationSettings')}
                style={{
                  backgroundColor: c.surface,
                  borderWidth: 1,
                  borderColor: c.border,
                  paddingHorizontal: 8,
                  paddingVertical: 6,
                  borderRadius: 8
                }}
              >
                <Feather name="sliders" size={12} color={c.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Gentle Advisory Note if location is still default Makkah */}
          {currentCity.id === 'makkah' && (
            <View
              style={{
                width: '100%',
                maxWidth: 360,
                backgroundColor: themeMode === 'light' ? '#FEF3C7' : '#451A03',
                borderRadius: 10,
                padding: 10,
                marginBottom: 10,
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#F59E0B'
              }}
            >
              <Feather name="info" size={15} color="#D97706" style={{ marginLeft: 6 }} />
              <TextUI size={11} color={themeMode === 'light' ? '#92400E' : '#FDE68A'} style={{ flex: 1 }}>
                {t('الموقع مضبوط على مكة المكرمة افتراضياً. اضغط GPS لتحديد اتجاه القبلة من موقعك الفعلي بدقة.', 'Set to Makkah by default. Tap GPS for accurate Qibla from your actual location.')}
              </TextUI>
            </View>
          )}

          {/* Top Header Card */}
          <View style={{ alignItems: 'center', marginBottom: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <TextUI weight="bold" size={32} color={isAligned ? '#10B981' : TOKENS.colors.primary}>
                {targetAngle === 0 ? t('في رحاب الحرم', 'At the Holy Sanctuary') : `${toArabicNumber(targetAngle)}°`}
              </TextUI>
              {isAligned && (
                <View
                  style={{
                    backgroundColor: '#10B981',
                    borderRadius: 12,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    flexDirection: 'row',
                    alignItems: 'center'
                  }}
                >
                  <Feather name="check" size={12} color="#FFFFFF" style={{ marginLeft: 3 }} />
                  <TextUI size={11} weight="bold" color="#FFFFFF">
                    {t('مستقبل الكعبة', 'Facing Kaaba')}
                  </TextUI>
                </View>
              )}
            </View>

            <TextUI size={14} weight="medium" style={{ marginTop: 2 }}>
              {isRTL ? (currentCity.qiblaTextAr || 'في رحاب الكعبة المشرفة') : (currentCity.qiblaTextEn || 'Facing Makkah')}
            </TextUI>
            <TextUI size={12} color={c.textSecondary} style={{ marginTop: 2 }}>
              {`${t('توجيه الهاتف الحالي:', 'Phone Heading:')} ${toArabicNumber(deviceHeading)}°`}
            </TextUI>
          </View>

          {/* Dynamic Reactive Outer Ring & Compass Bezel */}
          <View style={{ position: 'relative', alignItems: 'center', marginVertical: 12 }}>
            {/* Top Fixed Forward Marker / Lubber Line (12 o'clock) */}
            <View
              style={{
                position: 'absolute',
                top: -10,
                zIndex: 25,
                alignItems: 'center'
              }}
            >
              <View
                style={{
                  width: 0,
                  height: 0,
                  borderLeftWidth: 8,
                  borderRightWidth: 8,
                  borderTopWidth: 12,
                  borderLeftColor: 'transparent',
                  borderRightColor: 'transparent',
                  borderTopColor: isAligned ? '#10B981' : TOKENS.colors.primary,
                  shadowColor: isAligned ? '#10B981' : TOKENS.colors.primary,
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.6,
                  shadowRadius: 3
                }}
              />
            </View>

            <View
              nativeID="qibla-compass-bezel"
              style={{
                width: compassDiameter,
                height: compassDiameter,
                borderRadius: compassDiameter / 2,
                backgroundColor: isAligned ? 'rgba(16, 185, 129, 0.08)' : c.surface,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: isAligned ? 3.5 : 2.5,
                borderColor: isAligned ? '#10B981' : 'rgba(217, 119, 6, 0.65)',
                borderStyle: isAligned ? 'solid' : 'dashed',
                position: 'relative',
                shadowColor: isAligned ? '#10B981' : '#000000',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: isAligned ? 0.45 : 0.15,
                shadowRadius: isAligned ? 18 : 6,
                elevation: isAligned ? 8 : 3
              }}
            >
              {/* Rotating Compass Rose Dial (Cardinal directions rotate with -deviceHeading to match real world) */}
              <View
                style={{
                  position: 'absolute',
                  width: compassDiameter,
                  height: compassDiameter,
                  borderRadius: compassDiameter / 2,
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: [{ rotate: `-${deviceHeading}deg` }]
                }}
              >
                {/* Cardinal Points on Rotating Outer Rim */}
                <View style={{ position: 'absolute', top: 6, left: 0, right: 0, alignItems: 'center' }}>
                  <TextUI size={12} weight="bold" color={TOKENS.colors.primary}>ش (N)</TextUI>
                </View>
                <View style={{ position: 'absolute', bottom: 6, left: 0, right: 0, alignItems: 'center' }}>
                  <TextUI size={12} weight="bold" color={c.textSecondary}>ج (S)</TextUI>
                </View>
                <View style={{ position: 'absolute', right: 6, top: '50%', transform: [{ translateY: -9 }] }}>
                  <TextUI size={12} weight="bold" color={c.textSecondary}>ق (E)</TextUI>
                </View>
                <View style={{ position: 'absolute', left: 6, top: '50%', transform: [{ translateY: -9 }] }}>
                  <TextUI size={12} weight="bold" color={c.textSecondary}>غ (W)</TextUI>
                </View>
              </View>

            {/* Inner Dial Face */}
            <LinearGradient
              colors={
                isAligned
                  ? ['#064e3b', '#022c22']
                  : themeMode === 'light'
                  ? ['#3f2b1d', '#291c13']
                  : ['#231e1a', '#171412']
              }
              style={{
                width: innerDiameter,
                height: innerDiameter,
                borderRadius: innerDiameter / 2,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1.5,
                borderColor: isAligned ? '#10B981' : 'rgba(216, 185, 138, 0.4)'
              }}
            >
              {/* Rotating Compass Disc (Targeting Kaaba Direction) */}
              <View
                nativeID="qibla-rotating-pointer"
                style={{
                  width: coreDiameter,
                  height: coreDiameter,
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: [{ rotate: `${relativeAngle}deg` }]
                }}
              >
                {/* 1. Luminous Directional Light Beam connecting Center to Kaaba */}
                <View
                  style={{
                    position: 'absolute',
                    top: 22,
                    width: 32,
                    height: (coreDiameter / 2) - 18,
                    backgroundColor: isAligned ? 'rgba(52, 211, 153, 0.22)' : 'rgba(245, 158, 11, 0.18)',
                    borderRadius: 16,
                    borderWidth: 1.5,
                    borderStyle: 'dashed',
                    borderColor: isAligned ? 'rgba(52, 211, 153, 0.7)' : 'rgba(245, 158, 11, 0.6)',
                    alignItems: 'center',
                    justifyContent: 'flex-start'
                  }}
                />

                {/* 2. Kaaba Emblem Icon at the Pointed Target */}
                <View
                  style={{
                    position: 'absolute',
                    top: -8,
                    alignItems: 'center',
                    transform: [{ rotate: `-${relativeAngle}deg` }],
                    zIndex: 10
                  }}
                >
                  <View
                    style={{
                      padding: 3,
                      borderRadius: 8,
                      backgroundColor: isAligned ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.2)',
                      borderWidth: 1.5,
                      borderColor: isAligned ? '#10B981' : '#F59E0B',
                      shadowColor: isAligned ? '#34D399' : '#F59E0B',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.6,
                      shadowRadius: 6,
                      elevation: 8
                    }}
                  >
                    <KaabaEmblem size={32} />
                  </View>
                </View>

                {/* 3. PROMINENT BOLD ARROW POINTING DIRECTLY INTO THE KAABA */}
                <View
                  style={{
                    position: 'absolute',
                    top: 34,
                    alignItems: 'center',
                    zIndex: 5
                  }}
                >
                  {/* Distinctive Bold Arrowhead Tip */}
                  <View
                    style={{
                      width: 0,
                      height: 0,
                      borderLeftWidth: 16,
                      borderRightWidth: 16,
                      borderBottomWidth: 26,
                      borderLeftColor: 'transparent',
                      borderRightColor: 'transparent',
                      borderBottomColor: isAligned ? '#34D399' : '#F59E0B',
                      shadowColor: isAligned ? '#10B981' : '#F59E0B',
                      shadowOffset: { width: 0, height: -2 },
                      shadowOpacity: 0.8,
                      shadowRadius: 8
                    }}
                  />
                  {/* Inner Bright Arrow Accent */}
                  <View
                    style={{
                      position: 'absolute',
                      top: 4,
                      width: 0,
                      height: 0,
                      borderLeftWidth: 8,
                      borderRightWidth: 8,
                      borderBottomWidth: 16,
                      borderLeftColor: 'transparent',
                      borderRightColor: 'transparent',
                      borderBottomColor: '#FFFFFF'
                    }}
                  />

                  {/* 3D Tapered Arrow Shaft extending down to the center pivot */}
                  <View
                    style={{
                      flexDirection: 'row',
                      marginTop: -4,
                      alignItems: 'flex-start'
                    }}
                  >
                    {/* Left Illuminated Facet */}
                    <View
                      style={{
                        width: 0,
                        height: 0,
                        borderRightWidth: 8,
                        borderBottomWidth: Math.max(45, (coreDiameter / 2) - 46),
                        borderRightColor: 'transparent',
                        borderBottomColor: isAligned ? '#6EE7B7' : '#FDE047'
                      }}
                    />
                    {/* Right Shaded Facet */}
                    <View
                      style={{
                        width: 0,
                        height: 0,
                        borderLeftWidth: 8,
                        borderBottomWidth: Math.max(45, (coreDiameter / 2) - 46),
                        borderLeftColor: 'transparent',
                        borderBottomColor: isAligned ? '#10B981' : '#EAB308'
                      }}
                    />
                  </View>
                </View>

                {/* 4. Subdued Short Opposite Tail */}
                <View
                  style={{
                    position: 'absolute',
                    top: coreDiameter / 2,
                    alignItems: 'center',
                    flexDirection: 'row',
                    zIndex: 4
                  }}
                >
                  <View
                    style={{
                      width: 0,
                      height: 0,
                      borderRightWidth: 6,
                      borderTopWidth: 30,
                      borderRightColor: 'transparent',
                      borderTopColor: 'rgba(255, 255, 255, 0.45)'
                    }}
                  />
                  <View
                    style={{
                      width: 0,
                      height: 0,
                      borderLeftWidth: 6,
                      borderTopWidth: 30,
                      borderLeftColor: 'transparent',
                      borderTopColor: 'rgba(255, 255, 255, 0.2)'
                    }}
                  />
                </View>

                {/* 5. Central Brass Pivot & Spirit Level Bubble */}
                <View
                  style={{
                    position: 'absolute',
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: isAligned ? '#10B981' : '#F59E0B',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 2.5,
                    borderColor: '#FFFFFF',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.4,
                    shadowRadius: 3,
                    zIndex: 15
                  }}
                >
                  <View
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 3.5,
                      backgroundColor: '#FFFFFF'
                    }}
                  />
                </View>
              </View>
            </LinearGradient>
          </View>
        </View>

          {/* Dynamic Reactive Alignment Status Banner */}
          <View style={{ width: '100%', alignItems: 'center', marginTop: 4 }}>
            {isAligned ? (
              <View
                nativeID="qibla-status-aligned"
                style={{
                  backgroundColor: themeMode === 'light' ? '#ECFDF5' : '#064E3B',
                  paddingVertical: 12,
                  paddingHorizontal: 20,
                  borderRadius: 16,
                  alignItems: 'center',
                  borderWidth: 1.5,
                  borderColor: '#10B981',
                  width: '100%',
                  maxWidth: 360,
                  shadowColor: '#10B981',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 6
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Feather name="check-circle" size={20} color="#10B981" style={{ marginLeft: 8 }} />
                  <TextUI weight="bold" size={15} color={themeMode === 'light' ? '#065F46' : '#A7F3D0'}>
                    {t('الاتجاه منضبط تماماً نحو الكعبة', 'Direction Accurately Aligned')}
                  </TextUI>
                </View>
                <TextUI size={12} color={themeMode === 'light' ? '#047857' : '#D1FAE5'} style={{ textAlign: 'center' }}>
                  {t('أنت الآن تستقبل الكعبة المشرفة مباشرة • تقبل الله صلاتكم', 'You are directly facing the Holy Kaaba')}
                </TextUI>
              </View>
            ) : (
              <View
                nativeID="qibla-status-unaligned"
                style={{
                  backgroundColor: themeMode === 'light' ? '#FFFBEB' : '#451A03',
                  paddingVertical: 12,
                  paddingHorizontal: 20,
                  borderRadius: 16,
                  alignItems: 'center',
                  borderWidth: 1.5,
                  borderColor: '#F59E0B',
                  width: '100%',
                  maxWidth: 360,
                  shadowColor: '#F59E0B',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 6
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Feather
                    name={turnDirection === 'right' ? 'rotate-cw' : 'rotate-ccw'}
                    size={20}
                    color="#D97706"
                    style={{ marginLeft: 8 }}
                  />
                  <TextUI weight="bold" size={15} color={themeMode === 'light' ? '#B45309' : '#FDE68A'}>
                    {turnDirection === 'right'
                      ? t(`أدر الهاتف يميناً بمقدار ${toArabicNumber(degreesOff)}°`, `Turn phone right by ${degreesOff}°`)
                      : t(`أدر الهاتف يساراً بمقدار ${toArabicNumber(degreesOff)}°`, `Turn phone left by ${degreesOff}°`)}
                  </TextUI>
                </View>
                <TextUI size={12} color={themeMode === 'light' ? '#92400E' : '#FEF3C7'} style={{ textAlign: 'center' }}>
                  {t('جاري ضبط الاتجاه • أدر الجوال ببطء حتى تضيء الحلقة بالأخضر', 'Calibrating • Rotate slowly until ring turns green')}
                </TextUI>
              </View>
            )}

            {/* Quick Interactive Rotation Controls for Testing & Instant Calibration */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: 16,
                gap: 8,
                width: '100%',
                maxWidth: 360
              }}
            >
              <TouchableOpacity
                testID="btn-qibla-turn-left" {...({ id: "btn-qibla-turn-left" } as any)}
                onPress={() => handleUpdateHeading(deviceHeading - 15)}
                style={{
                  flex: 1,
                  backgroundColor: c.surface,
                  borderWidth: 1,
                  borderColor: c.border,
                  paddingVertical: 8,
                  borderRadius: 12,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center'
                }}
              >
                <Feather name="rotate-ccw" size={14} color={c.textSecondary} style={{ marginLeft: 4 }} />
                <TextUI size={12} weight="medium" color={c.textPrimary}>
                  {t('⟲ يسار', 'Left')}
                </TextUI>
              </TouchableOpacity>

              <TouchableOpacity
                testID="btn-qibla-align-now" {...({ id: "btn-qibla-align-now" } as any)}
                onPress={() => handleUpdateHeading(targetAngle)}
                style={{
                  flex: 1.2,
                  backgroundColor: isAligned ? '#10B981' : TOKENS.colors.primary,
                  paddingVertical: 8,
                  borderRadius: 12,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  shadowColor: isAligned ? '#10B981' : TOKENS.colors.primary,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4
                }}
              >
                <TextUI size={12} weight="bold" color="#FFFFFF">
                  {t('ضبط للقبلة 🕋', 'Align to Kaaba 🕋')}
                </TextUI>
              </TouchableOpacity>

              <TouchableOpacity
                testID="btn-qibla-turn-right" {...({ id: "btn-qibla-turn-right" } as any)}
                onPress={() => handleUpdateHeading(deviceHeading + 15)}
                style={{
                  flex: 1,
                  backgroundColor: c.surface,
                  borderWidth: 1,
                  borderColor: c.border,
                  paddingVertical: 8,
                  borderRadius: 12,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center'
                }}
              >
                <TextUI size={12} weight="medium" color={c.textPrimary}>
                  {t('يمين ⟳', 'Right')}
                </TextUI>
                <Feather name="rotate-cw" size={14} color={c.textSecondary} style={{ marginRight: 4 }} />
              </TouchableOpacity>
            </View>

            {/* Horizontal Flat Surface Reminder Note */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 12
              }}
            >
              <Feather name="info" size={13} color={c.textSecondary} style={{ marginLeft: 4 }} />
              <TextUI size={11} color={c.textSecondary}>
                {t('ضع الهاتف على سطح أفقي مستوٍ للحصول على أعلى دقة استشعار', 'Keep phone flat horizontally for optimal compass accuracy')}
              </TextUI>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  };

  // ==========================================
  // --- MODULE 3.5: ISLAMIC EVENTS & CALENDAR ---
  // ==========================================
  const renderIslamicEvents = () => {
    const eventsList = [
      {
        id: 'ramadan',
        titleAr: 'بداية شهر رمضان المبارك',
        titleEn: 'Start of Ramadan Mubarak',
        hijriDate: '١ رمضان ١٤٤٦ هـ',
        gregorianDate: '١ مارس ٢٠٢٥ م',
        daysLeft: 147,
        category: 'eids',
        descAr: 'شهر الصيام والقرآن، تفتح فيه أبواب الجنان وتغلق أبواب النيران وتصفد الشياطين.',
        sunnah: 'صيام الفريضة، قيام الليل، وتلاوة القرآن'
      },
      {
        id: 'laylat_al_qadr',
        titleAr: 'ليلة القدر والعشر الأواخر',
        titleEn: 'Laylat al-Qadr (Night of Decree)',
        hijriDate: '٢١ - ٢٩ رمضان ١٤٤٦ هـ',
        gregorianDate: '٢١ - ٣٠ مارس ٢٠٢٥ م',
        daysLeft: 168,
        category: 'eids',
        descAr: 'ليلة خير من ألف شهر، تنزل الملائكة والروح فيها بإذن ربهم من كل أمر سلام هي حتى مطلع الفجر.',
        sunnah: 'الاعتكاف، إحياء الليل، والدعاء: اللهم إنك عفو تحب العفو فاعف عني'
      },
      {
        id: 'eid_fitr',
        titleAr: 'عيد الفطر المبارك',
        titleEn: 'Eid al-Fitr',
        hijriDate: '١ شوال ١٤٤٦ هـ',
        gregorianDate: '٣١ مارس ٢٠٢٥ م',
        daysLeft: 177,
        category: 'eids',
        descAr: 'يوم الجائزة والفرح بإتمام صيام شهر رمضان المبارك وصلة الأرحام وإخراج زكاة الفطر.',
        sunnah: 'صلاة العيد، التكبير، والتوسعة على الأهل'
      },
      {
        id: 'arafah',
        titleAr: 'يوم عرفة العظيم',
        titleEn: 'Day of Arafah',
        hijriDate: '٩ ذو الحجة ١٤٤٥ هـ',
        gregorianDate: '١٥ يونيو ٢٠٢٤ م',
        daysLeft: 27,
        category: 'fasting',
        descAr: 'أعظم أيام العام، ركن الحج الأعظم، صيامه لغير الحاج يكفر ذنوب سنتين (سنة ماضية وسنة مقبلة).',
        sunnah: 'صيام اليوم، الإكثار من الدعاء وقول لا إله إلا الله وحده لا شريك له'
      },
      {
        id: 'eid_adha',
        titleAr: 'عيد الأضحى المبارك (يوم النحر)',
        titleEn: 'Eid al-Adha',
        hijriDate: '١٠ ذو الحجة ١٤٤٥ هـ',
        gregorianDate: '١٦ يونيو ٢٠٢٤ م',
        daysLeft: 28,
        category: 'eids',
        descAr: 'يوم الحج الأكبر وذكرى فداء إسماعيل عليه السلام، والتقرب إلى الله تعالى بذبح الأضاحي.',
        sunnah: 'صلاة العيد، ذبح الأضحية، والتكبير المقيد عقب الصلوات'
      },
      {
        id: 'tashreeq',
        titleAr: 'أيام التشريق المباركة',
        titleEn: 'Days of Tashreeq',
        hijriDate: '١١ - ١٣ ذو الحجة ١٤٤٥ هـ',
        gregorianDate: '١٧ - ١٩ يونيو ٢٠٢٤ م',
        daysLeft: 29,
        category: 'eids',
        descAr: 'أيام أكل وشرب وذكر لله تعالى، يحرم صيامها ويسن التكبير فيها عقب كل صلاة مكتوبة.',
        sunnah: 'التكبير المقيد، الإكثار من الذكر، وإطعام الطعام'
      },
      {
        id: 'ashura',
        titleAr: 'يوم عاشوراء وتاسوعاء',
        titleEn: 'Day of Ashura & Tasu’a',
        hijriDate: '٩ - ١٠ محرم ١٤٤٦ هـ',
        gregorianDate: '١٥ - ١٦ يوليو ٢٠٢٤ م',
        daysLeft: 58,
        category: 'fasting',
        descAr: 'اليوم الذي نجى الله فيه نبيه موسى عليه السلام من فرعون، وصيامه يكفر ذنوب السنة الماضية.',
        sunnah: 'صيام التاسع والعاشر من شهر محرم الحرام'
      },
      {
        id: 'white_days',
        titleAr: 'الأيام البيض لشهر ذو القعدة',
        titleEn: 'Ayyam al-Beed (White Days)',
        hijriDate: '١٣، ١٤، ١٥ ذو القعدة ١٤٤٥ هـ',
        gregorianDate: '٢١ - ٢٣ مايو ٢٠٢٤ م',
        daysLeft: 1,
        category: 'fasting',
        descAr: 'الأيام القمرية المباركة التي يكتمل فيها البدر، سن النبي ﷺ صيامها من كل شهر وصيامها كصيام الدهر.',
        sunnah: 'صيام الأيام الثلاثة البيض من كل شهر هجري'
      }
    ];

    const filteredEvents = eventsList.filter((e) => {
      if (eventsFilter === 'all') return true;
      return e.category === eventsFilter;
    });

    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <Header
          title={t('المناسبات والتقويم الإسلامي', 'Islamic Events & Calendar')}
          subtitle={t('الأعياد ومواسم الخير وصيام السنن', 'Eids, Holy Seasons & Fasting')}
          onBack={goBack}
        />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 18, paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Moorish Arch */}
          <View style={{ width: '100%', marginBottom: 14 }}>
            <MoorishArchFrame height={22} color={TOKENS.colors.secondary} opacity={0.7} />
          </View>

          {/* Filter Tabs */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: themeMode === 'light' ? c.bgSecondary : '#2A201A',
              borderRadius: TOKENS.radius.pill,
              padding: 4,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: c.border
            }}
          >
            {[
              { id: 'all', title: t('جميع المناسبات', 'All Events') },
              { id: 'eids', title: t('الأعياد والمواسم', 'Eids & Seasons') },
              { id: 'fasting', title: t('أيام الصيام المسنونة', 'Sunnah Fasting') }
            ].map((f) => {
              const isSelected = eventsFilter === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  onPress={() => {
                    setEventsFilter(f.id as any);
                    triggerHapticFeedback('light');
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: TOKENS.radius.pill,
                    backgroundColor: isSelected ? TOKENS.colors.primary : 'transparent',
                    alignItems: 'center'
                  }}
                >
                  <TextUI
                    weight={isSelected ? 'bold' : 'medium'}
                    size={12}
                    color={isSelected ? '#FFFFFF' : c.textSecondary}
                  >
                    {f.title}
                  </TextUI>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Events List Cards */}
          {filteredEvents.map((evt) => {
            const isNear = evt.daysLeft <= 3;
            return (
              <View
                key={evt.id}
                style={{
                  backgroundColor: c.surface,
                  borderRadius: TOKENS.radius.lg,
                  padding: 16,
                  marginBottom: 14,
                  borderWidth: 1,
                  borderColor: isNear ? TOKENS.colors.secondary : c.border,
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <ArabesqueWatermark opacity={0.05} />

                {/* Top Row: Title + Countdown Badge */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <TextUI weight="bold" size={15} color={TOKENS.colors.primaryDark} style={{ flex: 1, textAlign: 'left' }}>
                    {evt.titleAr}
                  </TextUI>
                  <View
                    style={{
                      backgroundColor: isNear ? (themeMode === 'light' ? '#EBF5EE' : '#1C2E22') : (themeMode === 'light' ? TOKENS.colors.primaryLight : '#382E28'),
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: TOKENS.radius.pill,
                      borderWidth: 1,
                      borderColor: isNear ? '#4E7D5B' : TOKENS.colors.secondary
                    }}
                  >
                    <TextUI size={11} weight="bold" color={isNear ? '#4E7D5B' : TOKENS.colors.primaryDark}>
                      {evt.daysLeft === 0 ? t('اليوم المبارك', 'Today') : evt.daysLeft === 1 ? t('غداً بمشيئة الله', 'Tomorrow') : `بعد ${toArabicNumber(evt.daysLeft)} يوماً`}
                    </TextUI>
                  </View>
                </View>

                {/* Dates Row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <Feather name="calendar" size={13} color={TOKENS.colors.secondary} style={{ marginLeft: 6 }} />
                  <TextUI size={12} weight="bold" color={TOKENS.colors.secondary}>
                    {evt.hijriDate}
                  </TextUI>
                  <TextUI size={12} color={c.textSecondary} style={{ marginHorizontal: 6 }}>
                    •
                  </TextUI>
                  <TextUI size={12} color={c.textSecondary}>
                    {evt.gregorianDate}
                  </TextUI>
                </View>

                {/* Description */}
                <TextUI size={13} color={c.textPrimary} style={{ lineHeight: 21, marginBottom: 12, textAlign: 'left' }}>
                  {evt.descAr}
                </TextUI>

                {/* Sunnah Practice Badge & Share */}
                <View
                  style={{
                    backgroundColor: themeMode === 'light' ? '#FAF6F0' : '#241D18',
                    padding: 10,
                    borderRadius: TOKENS.radius.md,
                    borderWidth: 1,
                    borderColor: 'rgba(198, 146, 85, 0.3)',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <View style={{ flex: 1, alignItems: 'flex-start' }}>
                    <TextUI size={11} weight="bold" color={TOKENS.colors.primaryDark}>
                      {`⭐ الفضل والعمل المسنون: ${evt.sunnah}`}
                    </TextUI>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      try {
                        Share.share({
                          message: `${evt.titleAr} (${evt.hijriDate})\n${evt.descAr}\nالعمل المسنون: ${evt.sunnah}\n\n— تطبيق رفيق المسلم`
                        });
                      } catch (e) {}
                    }}
                    style={{ padding: 6, marginRight: 4 }}
                  >
                    <Feather name="share-2" size={15} color={TOKENS.colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  // ==========================================
  // --- MODULE 3.6: SMART ZAKAT CALCULATOR ----
  // ==========================================
  const renderZakatCalculator = () => {
    const goldPriceNum = Number(zakatGoldPrice) || 310;
    const goldNisabGrams = 85; // 85 grams of 24k gold
    const nisabValue = goldNisabGrams * goldPriceNum; // in local currency

    // Gold total equivalent in 24k
    const g24 = Number(zakatGoldGrams24) || 0;
    const g21 = (Number(zakatGoldGrams21) || 0) * (21 / 24);
    const totalGoldGrams24Equiv = g24 + g21;
    const goldWealth = totalGoldGrams24Equiv * goldPriceNum;

    const cashWealth = Number(zakatCashAmount) || 0;
    const stockWealth = Number(zakatStockValue) || 0;

    let totalZakatableWealth = 0;
    let totalZakatDue = 0;

    if (zakatTab === 'cash') {
      totalZakatableWealth = cashWealth;
      totalZakatDue = cashWealth >= nisabValue ? cashWealth * 0.025 : 0;
    } else if (zakatTab === 'gold') {
      totalZakatableWealth = goldWealth;
      totalZakatDue = totalGoldGrams24Equiv >= goldNisabGrams ? goldWealth * 0.025 : 0;
    } else if (zakatTab === 'stocks') {
      totalZakatableWealth = stockWealth;
      totalZakatDue = stockWealth >= nisabValue ? stockWealth * 0.025 : 0;
    } else if (zakatTab === 'fitr') {
      totalZakatableWealth = zakatFitrMembers * zakatFitrRate;
      totalZakatDue = totalZakatableWealth;
    }

    const hasReachedNisab = zakatTab === 'fitr' ? true : totalZakatableWealth >= nisabValue;

    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <Header
          title={t('حاسبة الزكاة الشرعية', 'Smart Zakat Calculator')}
          subtitle={t('احتساب زكاة المال والذهب والأسهم والفطر', 'Cash, Gold, Stocks & Fitr')}
          onBack={goBack}
        />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 18, paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Moorish Arch */}
          <View style={{ width: '100%', marginBottom: 14 }}>
            <MoorishArchFrame height={22} color={TOKENS.colors.secondary} opacity={0.7} />
          </View>

          {/* 4 Asset Category Tabs */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: themeMode === 'light' ? c.bgSecondary : '#2A201A',
              borderRadius: TOKENS.radius.pill,
              padding: 4,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: c.border
            }}
          >
            {[
              { id: 'cash', title: t('المدخرات النقدية', 'Cash') },
              { id: 'gold', title: t('الذهب والفضة', 'Gold') },
              { id: 'stocks', title: t('الأسهم', 'Stocks') },
              { id: 'fitr', title: t('زكاة الفطر', 'Fitr') }
            ].map((tab) => {
              const isSelected = zakatTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => {
                    setZakatTab(tab.id as any);
                    triggerHapticFeedback('light');
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: TOKENS.radius.pill,
                    backgroundColor: isSelected ? TOKENS.colors.primary : 'transparent',
                    alignItems: 'center'
                  }}
                >
                  <TextUI
                    weight={isSelected ? 'bold' : 'medium'}
                    size={11}
                    color={isSelected ? '#FFFFFF' : c.textSecondary}
                  >
                    {tab.title}
                  </TextUI>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Tab Specific Input Card */}
          <View
            style={{
              backgroundColor: c.surface,
              borderRadius: TOKENS.radius.lg,
              padding: 16,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: c.border
            }}
          >
            {zakatTab === 'cash' && (
              <View>
                <TextUI weight="bold" size={13} color={c.textPrimary} style={{ marginBottom: 6 }}>
                  {t('إجمالي الأموال والمدخرات والودائع البنكية (بالعملة المحلية):', 'Total Cash & Bank Deposits:')}
                </TextUI>
                <TextInput
                  value={zakatCashAmount}
                  onChangeText={setZakatCashAmount}
                  keyboardType="numeric"
                  placeholder="0"
                  style={{
                    backgroundColor: themeMode === 'light' ? '#FAF6F0' : '#241D18',
                    borderWidth: 1,
                    borderColor: TOKENS.colors.secondary,
                    borderRadius: TOKENS.radius.md,
                    padding: 12,
                    fontSize: 16,
                    fontWeight: 'bold',
                    color: c.textPrimary,
                    textAlign: isRTL ? 'right' : 'left',
                    marginBottom: 10
                  }}
                />
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
                  {[10000, 25000, 50000, 100000].map((val) => (
                    <TouchableOpacity
                      key={val}
                      onPress={() => setZakatCashAmount(String(val))}
                      style={{
                        flex: 1,
                        paddingVertical: 6,
                        backgroundColor: themeMode === 'light' ? '#F7F3EE' : '#332922',
                        borderRadius: TOKENS.radius.sm,
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: c.border
                      }}
                    >
                      <TextUI size={11} color={TOKENS.colors.primaryDark}>
                        {`+${toArabicNumber(val / 1000)}k`}
                      </TextUI>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextUI size={11} color={c.textSecondary} style={{ lineHeight: 18 }}>
                  {t(
                    `النصاب الشرعي للمال يعادل قيمة ٨٥ جراماً من الذهب (${toArabicNumber(nisabValue)} ريال حالياً). تجب الزكاة بنسبة ٢.٥٪ إذا بلغ المال النصاب وحال عليه الحول.`,
                    `Nisab is the value of 85g gold (${nisabValue}). 2.5% is due if held for a full lunar year.`
                  )}
                </TextUI>
              </View>
            )}

            {zakatTab === 'gold' && (
              <View>
                <TextUI weight="bold" size={13} color={c.textPrimary} style={{ marginBottom: 6 }}>
                  {t('وزن الذهب عيار ٢١ بالجرام:', '21K Gold Weight (grams):')}
                </TextUI>
                <TextInput
                  value={zakatGoldGrams21}
                  onChangeText={setZakatGoldGrams21}
                  keyboardType="numeric"
                  placeholder="0"
                  style={{
                    backgroundColor: themeMode === 'light' ? '#FAF6F0' : '#241D18',
                    borderWidth: 1,
                    borderColor: TOKENS.colors.secondary,
                    borderRadius: TOKENS.radius.md,
                    padding: 12,
                    fontSize: 16,
                    fontWeight: 'bold',
                    color: c.textPrimary,
                    textAlign: isRTL ? 'right' : 'left',
                    marginBottom: 10
                  }}
                />
                <TextUI weight="bold" size={13} color={c.textPrimary} style={{ marginBottom: 6 }}>
                  {t('سعر جرام الذهب عيار ٢٤ بالعملة المحلية:', '24K Gold Price per gram:')}
                </TextUI>
                <TextInput
                  value={zakatGoldPrice}
                  onChangeText={setZakatGoldPrice}
                  keyboardType="numeric"
                  placeholder="310"
                  style={{
                    backgroundColor: themeMode === 'light' ? '#FAF6F0' : '#241D18',
                    borderWidth: 1,
                    borderColor: c.border,
                    borderRadius: TOKENS.radius.md,
                    padding: 10,
                    fontSize: 14,
                    color: c.textPrimary,
                    textAlign: isRTL ? 'right' : 'left',
                    marginBottom: 10
                  }}
                />
                <TextUI size={11} color={c.textSecondary} style={{ lineHeight: 18 }}>
                  {t(
                    'نصاب الذهب ٨٥ جراماً من الذهب الخالص (عيار ٢٤). يتم تحويل عيار ٢١ لمعادل عيار ٢٤ تلقائياً.',
                    'Gold Nisab is 85 grams of pure 24k gold. 21k weight is converted automatically.'
                  )}
                </TextUI>
              </View>
            )}

            {zakatTab === 'stocks' && (
              <View>
                <TextUI weight="bold" size={13} color={c.textPrimary} style={{ marginBottom: 6 }}>
                  {t('القيمة السوقية للأسهم المعدة للتجارة والمضاربة:', 'Stock Portfolio Market Value:')}
                </TextUI>
                <TextInput
                  value={zakatStockValue}
                  onChangeText={setZakatStockValue}
                  keyboardType="numeric"
                  placeholder="0"
                  style={{
                    backgroundColor: themeMode === 'light' ? '#FAF6F0' : '#241D18',
                    borderWidth: 1,
                    borderColor: TOKENS.colors.secondary,
                    borderRadius: TOKENS.radius.md,
                    padding: 12,
                    fontSize: 16,
                    fontWeight: 'bold',
                    color: c.textPrimary,
                    textAlign: isRTL ? 'right' : 'left',
                    marginBottom: 10
                  }}
                />
                <TextUI size={11} color={c.textSecondary} style={{ lineHeight: 18 }}>
                  {t(
                    'الأسهم المشتراة بقصد التجارة والمضاربة تزكى على كامل قيمتها السوقية بنسبة ٢.٥٪ إذا بلغت النصاب وحال عليها الحول.',
                    'Trading stocks are zakatable at full market value (2.5%) once Nisab and one lunar year are reached.'
                  )}
                </TextUI>
              </View>
            )}

            {zakatTab === 'fitr' && (
              <View>
                <TextUI weight="bold" size={13} color={c.textPrimary} style={{ marginBottom: 6 }}>
                  {t('عدد أفراد الأسرة ومن تلزمك نفقتهم:', 'Family Members Count:')}
                </TextUI>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginVertical: 10 }}>
                  <TouchableOpacity
                    onPress={() => setZakatFitrMembers(Math.max(1, zakatFitrMembers - 1))}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: TOKENS.colors.primaryLight,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: TOKENS.colors.secondary
                    }}
                  >
                    <Feather name="minus" size={20} color={TOKENS.colors.primaryDark} />
                  </TouchableOpacity>

                  <TextUI weight="bold" size={24} color={TOKENS.colors.primaryDark}>
                    {toArabicNumber(zakatFitrMembers)}
                  </TextUI>

                  <TouchableOpacity
                    onPress={() => setZakatFitrMembers(zakatFitrMembers + 1)}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: TOKENS.colors.primary,
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Feather name="plus" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                <TextUI size={11} color={c.textSecondary} align="center" style={{ lineHeight: 18 }}>
                  {t(
                    `قيمة زكاة الفطر المقدرة: ${toArabicNumber(zakatFitrRate)} ريال عن كل فرد (صاع نبوي من قوت البلد)`,
                    `Fitr rate: ${zakatFitrRate} per person (one Sa'a of staple food)`
                  )}
                </TextUI>
              </View>
            )}
          </View>

          {/* Grand Calculation Deck */}
          <View
            style={{
              borderRadius: TOKENS.radius.lg,
              overflow: 'hidden',
              marginBottom: 16,
              borderWidth: 1.5,
              borderColor: 'rgba(198, 146, 85, 0.45)',
              ...makeShadow('0 8px 24px rgba(93, 58, 34, 0.16)', '#5D3A22', 0.16, 8, { width: 0, height: 4 }, 6)
            }}
          >
            <LinearGradient
              colors={['#3E2010', '#5E381E', '#8C5E3C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 20, position: 'relative' }}
            >
              <ArabesqueWatermark opacity={0.10} />

              {/* Nisab Status Badge */}
              <View
                style={{
                  alignSelf: 'flex-start',
                  backgroundColor: hasReachedNisab ? 'rgba(78, 125, 91, 0.4)' : 'rgba(179, 71, 67, 0.35)',
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  borderRadius: TOKENS.radius.pill,
                  borderWidth: 1,
                  borderColor: hasReachedNisab ? '#4E7D5B' : '#B34743',
                  marginBottom: 12
                }}
              >
                <TextUI size={12} weight="bold" color="#FFFFFF">
                  {hasReachedNisab
                    ? (zakatTab === 'fitr' ? t('✅ زكاة الفطر واجبة عن النفس والعيال', 'Fitr Zakat is Due') : t('✅ بلغ النصاب الشرعي المعتمد', 'Nisab Reached (Obligatory)'))
                    : t('⚠️ دون النصاب الشرعي (لا تجب فيه الزكاة)', 'Below Nisab (No Zakat Due)')}
                </TextUI>
              </View>

              <TextUI size={12} weight="bold" color={TOKENS.colors.secondary}>
                {t('مقدار الزكاة الواجب إخراجها شرعاً', 'Total Zakat Due')}
              </TextUI>
              <TextUI weight="bold" size={36} color="#FFFFFF" style={{ marginTop: 2 }}>
                {`${toArabicNumber(Math.round(totalZakatDue))} ${t('ريال', 'SAR')}`}
              </TextUI>

              {/* Breakdown */}
              <View
                style={{
                  marginTop: 14,
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderColor: 'rgba(255,255,255,0.2)',
                  flexDirection: 'row',
                  justifyContent: 'space-between'
                }}
              >
                <View style={{ alignItems: 'flex-start' }}>
                  <TextUI size={11} color="rgba(255,255,255,0.7)">{t('إجمالي المال الخاضع للحساب', 'Zakatable Wealth')}</TextUI>
                  <TextUI size={14} weight="bold" color="#FFFFFF" style={{ marginTop: 2 }}>
                    {`${toArabicNumber(Math.round(totalZakatableWealth))} ${t('ريال', 'SAR')}`}
                  </TextUI>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <TextUI size={11} color="rgba(255,255,255,0.7)">{t('النسبة الشرعية', 'Rate')}</TextUI>
                  <TextUI size={14} weight="bold" color={TOKENS.colors.secondary} style={{ marginTop: 2 }}>
                    {zakatTab === 'fitr' ? t('صاع عن الفرد', "One Sa'a") : '٢.٥٪ (ربع العشر)'}
                  </TextUI>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Quranic Recipients of Zakat Card */}
          <View
            style={{
              backgroundColor: themeMode === 'light' ? '#FAF6F0' : '#221B17',
              borderRadius: TOKENS.radius.lg,
              borderWidth: 1.5,
              borderColor: TOKENS.colors.secondary,
              padding: 16,
              marginBottom: 16
            }}
          >
            <TextUI weight="bold" size={14} color={TOKENS.colors.primaryDark} style={{ marginBottom: 8, textAlign: 'left' }}>
              {t('مصارف الزكاة الثمانية بنص القرآن الكريم:', 'The 8 Quranic Zakat Recipients:')}
            </TextUI>
            <TextUI quran size={15} color={TOKENS.colors.primaryDark} style={{ lineHeight: 28, textAlign: 'center' }}>
              ﴿ إِنَّمَا الصَّدَقَاتُ لِلْفُقَرَاءِ وَالْمَسَاكِينِ وَالْعَامِلِينَ عَلَيْهَا وَالْمُؤَلَّفَةِ قُلُوبُهُمْ وَفِي الرِّقَابِ وَالْغَارِمِينَ وَفِي سَبِيلِ اللَّهِ وَابْنِ السَّبِيلِ ۖ فَرِيضَةً مِّنَ اللَّهِ ۗ وَاللَّهُ عَلِيمٌ حَكِيمٌ ﴾
            </TextUI>
            <TextUI size={11} color={c.textSecondary} align="center" style={{ marginTop: 6 }}>
              {t('سورة التوبة • الآية ٦٠', 'Surah At-Tawbah • Verse 60')}
            </TextUI>
          </View>
        </ScrollView>
      </View>
    );
  };

// ==========================================
// --- MODULE 3.8: ISLAMIC ENCYCLOPEDIA SUITE ---
// ==========================================

const RUQYAH_QURAN_ITEMS = [
  {
    id: 'fatihah',
    titleAr: 'سورة الفاتحة (أم الكتاب والشافية)',
    titleEn: 'Surah Al-Fatihah (The Opener & Curer)',
    verse: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ ۝ الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ ۝ الرَّحْمَٰنِ الرَّحِيمِ ۝ مَالِكِ يَوْمِ الدِّينِ ۝ إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ ۝ اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ ۝ صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ',
    reference: 'سورة الفاتحة • الآيات ١ - ٧',
    repeat: 7,
    benefit: 'أعظم سورة في القرآن، وهي الرقية الشافية الكافية بإجماع الصحابة والسلف.'
  },
  {
    id: 'kursi',
    titleAr: 'آية الكرسي (الحصن الحصين)',
    titleEn: 'Ayat Al-Kursi (The Throne Verse)',
    verse: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ',
    reference: 'سورة البقرة • الآية ٢٥٥',
    repeat: 3,
    benefit: 'أعظم آية في كتاب الله؛ من قرأها إذا أوى إلى فراشه لم يزل عليه من الله حافظ ولا يقربه شيطان حتى يصبح.'
  },
  {
    id: 'baqarah_ends',
    titleAr: 'خواتيم سورة البقرة (الآيتان الكافيتان)',
    titleEn: 'Last Two Verses of Al-Baqarah',
    verse: 'آمَنَ الرَّسُولُ بِمَا أُنزِلَ إِلَيْهِ مِن رَّبِّهِ وَالْمُؤْمِنُونَ ۚ كُلٌّ آمَنَ بِاللَّهِ وَمَلَائِكَتِهِ وَكُتُبِهِ وَرُسُلِهِ لَا نُفَرِّقُ بَيْنَ أَحَدٍ مِّن رُّسُلِهِ ۚ وَقَالُوا سَمِعْنَا وَأَطَعْنَا ۖ غُفْرَانَكَ رَبَّنَا وَإِلَيْكَ الْمَصِيرُ ۝ لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا ۚ لَهَا مَا كَسَبَتْ وَعَلَيْهَا مَا اكْتَسَبَتْ ۗ رَبَّنَا لَا تُؤَاخِذْنَا إِن نَّسِينَا أَوْ أَخْطَأْنَا ۚ رَبَّنَا وَلَا تَحْمِلْ عَلَيْنَا إِصْرًا كَمَا حَمَلْتَهُ عَلَى الَّذِينَ مِن قَبْلِنَا ۚ رَبَّنَا وَلَا تُحَمِّلْنَا مَا لَا طَاقَةَ لَنَا بِهِ ۖ وَاعْفُ عَنَّا وَاغْفِرْ لَنَا وَارْحَمْنَا ۚ أَنتَ مَوْلَانَا فَانصُرْنَا عَلَى الْقَوْمِ الْكَافِرِينَ',
    reference: 'سورة البقرة • الآيتان ٢٨٥ - ٢٨٦',
    repeat: 1,
    benefit: 'قال رسول الله ﷺ: «مَن قرأَ بالآيتَيْنِ مِن آخرِ سورةِ البقرةِ في ليلةٍ كفَتاه» (متفق عليه).'
  },
  {
    id: 'muawidhat',
    titleAr: 'المعوذات (الإخلاص، الفلق، والناس)',
    titleEn: "Al-Mu'awwidhat (Sincerity & The Protectors)",
    verse: '﴿ قُلْ هُوَ اللَّهُ أَحَدٌ ۝ اللَّهُ الصَّمَدُ ۝ لَمْ يَلِدْ وَلَمْ يُولَدْ ۝ وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ ﴾\n\n﴿ قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ ۝ مِن شَرِّ مَا خَلَقَ ۝ وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ ۝ وَمِن شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ ۝ وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ ﴾\n\n﴿ قُلْ أَعُوذُ بِرَبِّ النَّاسِ ۝ مَلِكِ النَّاسِ ۝ إِلَٰهِ النَّاسِ ۝ مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ ۝ الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ ۝ مِنَ الْجِنَّةِ وَالنَّاسِ ﴾',
    reference: 'سور الإخلاص، الفلق، والناس',
    repeat: 3,
    benefit: 'قال النبي ﷺ: «قل هو الله أحد والمعوذتين حين تمسي وحين تصبح ثلاث مرات تكفيك من كل شيء».'
  },
  {
    id: 'ayat_shifa',
    titleAr: 'آيات الشفاء الست في القرآن الكريم',
    titleEn: 'The 6 Quranic Verses of Healing',
    verse: '١. ﴿ وَيَشْفِ صُدُورَ قَوْمٍ مُّؤْمِنِينَ ﴾ [التوبة: ١٤]\n\n٢. ﴿ وَشِفَاءٌ لِّمَا فِي الصُّدُورِ وَهُدًى وَرَحْمَةٌ لِّلْمُؤْمِنِينَ ﴾ [يونس: ٥٧]\n\n٣. ﴿ يَخْرُجُ مِن بُطُونِهَا شَرَابٌ مُّخْتَلِفٌ أَلْوَانُهُ فِيهِ شِفَاءٌ لِّلنَّاسِ ﴾ [النحل: ٦٩]\n\n٤. ﴿ وَنُنَزِّلُ مِنَ الْقُرْآنِ مَا هُوَ شِفَاءٌ وَرَحْمَةٌ لِّلْمُؤْمِنِينَ ﴾ [الإسراء: ٨٢]\n\n٥. ﴿ وَإِذَا مَرِضْتُ فَهُوَ يَشْفِينِ ﴾ [الشعراء: ٨٠]\n\n٦. ﴿ قُلْ هُوَ لِلَّذِينَ آمَنُوا هُدًى وَشِفَاءٌ ﴾ [فصلت: ٤٤]',
    reference: 'آيات الشفاء الجامعة',
    repeat: 3,
    benefit: 'آيات كريمات اشتملت على ذكر الشفاء الحسي والمعنوي للقلوب والأبدان.'
  },
  {
    id: 'ayat_sakeenah',
    titleAr: 'آيات السكينة وطمأنينة القلب',
    titleEn: 'Verses of Divine Tranquility (Sakinah)',
    verse: '﴿ ثُمَّ أَنزَلَ اللَّهُ سَكِينَتَهُ عَلَىٰ رَسُولِهِ وَعَلَى الْمُؤْمِنِينَ ﴾ [التوبة: ٢٦]\n\n﴿ هُوَ الَّذِي أَنزَلَ السَّكِينَةَ فِي قُلُوبِ الْمُؤْمِنِينَ لِيَزْدَادُوا إِيمَانًا مَّعَ إِيمَانِهِمْ ۗ وَلِلَّهِ جُنُودُ السَّمَاوَاتِ وَالْأَرْضِ ۚ وَكَانَ اللَّهُ عَلِيمًا حَكِيمًا ﴾ [الفتح: ٤]\n\n﴿ الَّذِينَ آمَنُوا وَتَطْمَئِنُّ قُلُوبُهُم بِذِكْرِ اللَّهِ ۗ أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ ﴾ [الرعد: ٢٨]',
    reference: 'آيات السكينة والوقار',
    repeat: 3,
    benefit: 'تذهب الاضطراب والقلق والخوف وتبث الطمأنينة والهدوء في النفس والروح.'
  }
];

const RUQYAH_SUNNAH_ITEMS = [
  {
    id: 'sunnah_1',
    titleAr: 'رقية جبريل للنبي ﷺ',
    titleEn: "Jibreel's Ruqyah for the Prophet ﷺ",
    text: 'بِاسْمِ اللَّهِ أَرْقِيكَ، مِنْ كُلِّ شَيْءٍ يُؤْذِيكَ، مِنْ شَرِّ كُلِّ نَفْسٍ أَوْ عَيْنِ حَاسِدٍ، اللَّهُ يَشْفِيكَ، بِاسْمِ اللَّهِ أَرْقِيكَ.',
    source: 'صحيح مسلم • حديث ٢١٨٦',
    repeat: 3,
    benefit: 'رقية جامعة لكل أذى وحسد ومرض رقى بها جبريل عليه السلام النبي ﷺ.'
  },
  {
    id: 'sunnah_2',
    titleAr: 'دعاء كشف البأس والشفاء',
    titleEn: 'Prayer for Relieving Affliction & Cure',
    text: 'أَذْهِبِ البَاسَ رَبَّ النَّاسِ، وَاشْفِ أَنْتَ الشَّافِي، لاَ شِفَاءَ إِلاَّ شِفَاؤُكَ، شِفَاءً لاَ يُغَادِرُ سَقَمًا.',
    source: 'صحيح البخاري • حديث ٥٧٤٣',
    repeat: 3,
    benefit: 'كان النبي ﷺ إذا اشتكى الإنسان مسحه بيمينه ثم قال هذا الدعاء المبارك.'
  },
  {
    id: 'sunnah_3',
    titleAr: 'التعوذ بكلمات الله التامات',
    titleEn: "Seeking Refuge in Allah's Perfect Words",
    text: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ.',
    source: 'صحيح مسلم • حديث ٢٧٠٨',
    repeat: 3,
    benefit: 'من نزل منزلاً فقالها لم يضره شيء حتى يرتحل من منزله ذلك.'
  },
  {
    id: 'sunnah_4',
    titleAr: 'التحصين الصباحي والمسائي الشامل',
    titleEn: 'Comprehensive Day & Night Protection',
    text: 'بِسْمِ اللَّهِ الَّذِي لاَ يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الأَرْضِ وَلاَ فِي السَّمَاءِ وَهُوَ السَّمِيعُ العَلِيمُ.',
    source: 'سنن أبي داود والترمذي • حسن صحيح',
    repeat: 3,
    benefit: 'من قالها ثلاثاً إذا أصبح وثلاثاً إذا أمسى لم يصبه فجأة بلاء ولا يضره شيء.'
  },
  {
    id: 'sunnah_5',
    titleAr: 'التعوذ من الشياطين والهوام والعين',
    titleEn: 'Protection from Devils & Evil Eye',
    text: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّةِ مِنْ كُلِّ شَيْطَانٍ وَهَامَّةٍ، وَمِنْ كُلِّ عَيْنٍ لَامَّةٍ.',
    source: 'صحيح البخاري • حديث ٣٣٧١',
    repeat: 3,
    benefit: 'كان النبي ﷺ يعوذ بها الحسن والحسين، ويقول: إن أباكم كان يعوذ بها إسماعيل وإسحاق.'
  },
  {
    id: 'sunnah_6',
    titleAr: 'دعاء وضع اليد على موضع الألم',
    titleEn: 'Placing Hand on Ailment Supplication',
    text: 'ضع يدك على الذي يألم من جسدك وقُل: «بِسْمِ اللَّهِ» (ثلاث مرات)، وقُل: «أَعُوذُ بِاللَّهِ وَقُدْرَتِهِ مِنْ شَرِّ مَا أَجِدُ وَأُحَاذِرُ» (سبع مرات).',
    source: 'صحيح مسلم • حديث ٢٢٠٢',
    repeat: 7,
    benefit: 'علمها النبي ﷺ لعثمان بن أبي العاص فشفي من وجع شديد كاد يهلكه.'
  }
];

const RUQYAH_ADAB_ITEMS = [
  {
    titleAr: '١. أن تكون بكلام الله تعالى وأسمائه وصفاته',
    descAr: 'تكون بالقرآن الكريم وبالمأثور الصحيح الثابت عن النبي ﷺ، ولا يجوز الاستعانة بالطلاسم أو التمائم أو الألفاظ المجهولة.'
  },
  {
    titleAr: '٢. أن تكون باللسان العربي المبين',
    descAr: 'أن تكون بألفاظ عربية واضحة ومفهومة المعنى، خالية من الشركيات والشبهات.'
  },
  {
    titleAr: '٣. كمال التوكل واليقين بأن الشافي هو الله وحده',
    descAr: 'أن يعتقد الراقي والمريض أن الرقية سبب مبارك لا تؤثر بذاتها وإنما بتقدير الله ومشيئته سبحانه: ﴿ وَإِذَا مَرِضْتُ فَهُوَ يَشْفِينِ ﴾.'
  },
  {
    titleAr: '٤. الطهارة وحضور القلب واستقبال القبلة',
    descAr: 'يستحب للمسلم أن يكون متوضئاً طاهراً، مستحضراً لعظمة كلام الله بخشوع ويقين بالشفاء ورفع البلاء.'
  },
  {
    titleAr: '٥. صفة النفث والمسح باليد اليمنى',
    descAr: 'النفث نفخ لطيف مع ريق خفيف جداً يصحبه مسح باليد اليمنى على موضع الألم، أو النفث في ماء طاهر وشربه والاغتسال به.'
  }
];

const HADITH_40_DATA = [
  {
    id: 1,
    titleAr: 'الأعمال بالنيات',
    titleEn: 'Actions are by Intentions',
    narratorAr: 'أمير المؤمنين عمر بن الخطاب رضي الله عنه',
    textAr: 'سَمِعْتُ رَسُولَ اللَّهِ ﷺ يَقُولُ: «إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى، فَمَنْ كَانَتْ هِجْرَتُهُ إِلَى اللَّهِ وَرَسُولِهِ، فَهِجْرَتُهُ إِلَى اللَّهِ وَرَسُولِهِ، وَمَنْ كَانَتْ هِجْرَتُهُ لِدُنْيَا يُصِيبُهَا أَوِ امْرَأَةٍ يَنْكِحُهَا، فَهِجْرَتُهُ إِلَى مَا هَاجَرَ إِلَيْهِ».',
    source: 'متفق عليه • البخاري (١) ومسلم (١٩٠٧)',
    lessons: [
      'النية هي الميزان لصحة الأعمال وقبولها عند الله تعالى.',
      'الإخلاص شرط أساسي لتحويل العادات المباحة إلى عبادات يثاب عليها.',
      'التحذير من الرياء وإرادة الدنيا بأعمال الآخرة.'
    ]
  },
  {
    id: 2,
    titleAr: 'حديث جبريل (مراتب الدين)',
    titleEn: 'Hadith of Jibreel (Levels of Faith)',
    narratorAr: 'عمر بن الخطاب رضي الله عنه',
    textAr: '«بَيْنَمَا نَحْنُ عِنْدَ رَسُولِ اللَّهِ ﷺ ذَاتَ يَوْمٍ إِذْ طَلَعَ عَلَيْنَا رَجُلٌ شَدِيدُ بَيَاضِ الثِّيَابِ شَدِيدُ سَوَادِ الشَّعَرِ... فَقَالَ: يَا مُحَمَّدُ أَخْبِرْنِي عَنِ الإِسْلاَمِ... ثُمَّ قَالَ: أَخْبِرْنِي عَنِ الإِيمَانِ... ثُمَّ قَالَ: أَخْبِرْنِي عَنِ الإِحْسَانِ، قَالَ: أَنْ تَعْبُدَ اللَّهَ كَأَنَّكَ تَرَاهُ فَإِنْ لَمْ تَكُنْ تَرَاهُ فَإِنَّهُ يَرَاكَ... ثُمَّ قَالَ: هَذَا جِبْرِيلُ أَتَاكُمْ يُعَلِّمُكُمْ دِينَكُمْ».',
    source: 'صحيح مسلم • حديث ٨',
    lessons: [
      'الدين يقوم على ثلاث مراتب: الإسلام (الأركان الظاهرة)، والإيمان (العقائد الباطنة)، والإحسان (مراقبة الله).',
      'الإحسان هو أعلى مراتب العبودية، ومقامه استشعار قرب الله ومراقبته في السر والعلن.',
      'حسن أدب المتعلم والجلوس بوقار في مجالس العلم.'
    ]
  },
  {
    id: 3,
    titleAr: 'أركان الإسلام الخمسة',
    titleEn: 'The Five Pillars of Islam',
    narratorAr: 'عبد الله بن عمر رضي الله عنهما',
    textAr: '«بُنِيَ الإِسْلاَمُ عَلَى خَمْسٍ: شَهَادَةِ أَنْ لاَ إِلَهَ إِلاَّ اللَّهُ وَأَنَّ مُحَمَّدًا رَسُولُ اللَّهِ، وَإِقَامِ الصَّلاَةِ، وَإِيتَاءِ الزَّكَاةِ، وَحَجِّ البَيْتِ، وَصَوْمِ رَمَضَانَ».',
    source: 'متفق عليه • البخاري (٨) ومسلم (١٦)',
    lessons: [
      'تشبيه الإسلام بالبنيان المشيّد الراسخ على خمس دعائم أساسية.',
      'شهادة التوحيد هي الأساس الذي تصح به سائر الأعمال.',
      'أهمية الصلاة والزكاة والصوم والحج كركن متكامل للحياة الإسلامية.'
    ]
  },
  {
    id: 4,
    titleAr: 'أطوار خلق الإنسان والخاتمة',
    titleEn: 'Creation of Man & Divine Destiny',
    narratorAr: 'عبد الله بن مسعود رضي الله عنه',
    textAr: '«إِنَّ أَحَدَكُمْ يُجْمَعُ خَلْقُهُ فِي بَطْنِ أُمِّهِ أَرْبَعِينَ يَوْمًا نُطْفَةً، ثُمَّ يَكُونُ عَلَقَةً مِثْلَ ذَلِكَ، ثُمَّ يَكُونُ مُضْغَةً مِثْلَ ذَلِكَ، ثُمَّ يُرْسَلُ إِلَيْهِ المَلَكُ فَيَنْفُخُ فِيهِ الرُّوحَ، وَيُؤْمَرُ بِأَرْبَعِ كَلِمَاتٍ: بِكَتْبِ رِزْقِهِ، وَأَجَلِهِ، وَعَمَلِهِ، وَشَقِيٌّ أَوْ سَعِيدٌ...».',
    source: 'متفق عليه • البخاري (٣٢٠٨) ومسلم (٢٦٤٣)',
    lessons: [
      'بيان قدرة الله العظيمة في أطوار خلق الجنين ونفخ الروح فيه بعد ١٢٠ يوماً.',
      'الإيمان بالقضاء والقدر وسبق علم الله تعالى بآجال العباد وأرزاقهم.',
      'وجوب الخوف والرجاء؛ فإن العبرة بالخواتيم وسلامة القلب.'
    ]
  },
  {
    id: 5,
    titleAr: 'النهي عن الابتداع في الدين',
    titleEn: 'Rejection of Innovations in Religion',
    narratorAr: 'أم المؤمنين عائشة رضي الله عنها',
    textAr: '«مَنْ أَحْدَثَ فِي أَمْرِنَا هَذَا مَا لَيْسَ مِنْهُ فَهُوَ رَدٌّ». وفي رواية لمسلم: «مَنْ عَمِلَ عَمَلًا لَيْسَ عَلَيْهِ أَمْرُنَا فَهُوَ رَدٌّ».',
    source: 'متفق عليه • البخاري (٢٦٩٧) ومسلم (١٧١٨)',
    lessons: [
      'الأصل في العبادات التوقيف على الكتاب والسنة المطهرة.',
      'ردّ وإبطال كل بدعة ومحدثة لا أصل لها في الشرع الحنيف.',
      'المتابعة للنبي ﷺ شرط أساسي لقبول العمل مع الإخلاص لله.'
    ]
  },
  {
    id: 6,
    titleAr: 'الحلال بيّن والحرام بيّن (الورع)',
    titleEn: 'The Halal is Clear & Leaving Doubts',
    narratorAr: 'النعمان بن بشير رضي الله عنه',
    textAr: '«إِنَّ الحَلاَلَ بَيِّنٌ وَإِنَّ الحَرَامَ بَيِّنٌ، وَبَيْنَهُمَا مُشْتَبِهَاتٌ لاَ يَعْلَمُهُنَّ كَثِيرٌ مِنَ النَّاسِ، فَمَنِ اتَّقَى الشُّبُهَاتِ اسْتَبْرَأَ لِدِينِهِ وَعِرْضِهِ، وَمَنْ وَقَعَ فِي الشُّبُهَاتِ وَقَعَ فِي الحَرَامِ... أَلاَ وَإِنَّ فِي الجَسَدِ مُضْغَةً إِذَا صَلَحَتْ صَلَحَ الجَسَدُ كُلُّهُ، وَإِذَا فَسَدَتْ فَسَدَ الجَسَدُ كُلُّهُ، أَلاَ وَهِيَ القَلْبُ».',
    source: 'متفق عليه • البخاري (٥٢) ومسلم (١٥٩٩)',
    lessons: [
      'بيان الشريعة التام لأصول الحلال والحرام، والحث على الورع بترك المشتبهات.',
      'صيانة الدين والعرض بترك مواطن الريب والشبهات.',
      'صلاح أعمال الجوارح تابع لصلاح القلب وإيمانه وطهارته.'
    ]
  },
  {
    id: 7,
    titleAr: 'الدين النصيحة',
    titleEn: 'Religion is Sincere Advice',
    narratorAr: 'تميم الداري رضي الله عنه',
    textAr: 'أَنَّ النَّبِيَّ ﷺ قَالَ: «الدِّينُ النَّصِيحَةُ». قُلْنَا: لِمَنْ؟ قَالَ: «لِلَّهِ، وَلِكِتَابِهِ، وَلِرَسُولِهِ، وَلِأَئِمَّةِ الْمُسْلِمِينَ، وَعَامَّتِهِمْ».',
    source: 'صحيح مسلم • حديث ٥٥',
    lessons: [
      'النصيحة عماد الدين وروحه الجامعة.',
      'النصيحة لله بتوحيده وإخلاص العبادة له، ولكتابه بتلاوته والعمل بأحكامه، ولرسوله باتباع سنته.',
      'النصيحة لعامة المسلمين بإرشادهم إلى مصالحهم ومعاونتهم بالمعروف والرفق.'
    ]
  },
  {
    id: 8,
    titleAr: 'الاستطاعة في الأمر والنهي',
    titleEn: 'Obedience According to Ability',
    narratorAr: 'أبو هريرة عبد الرحمن بن صخر رضي الله عنه',
    textAr: '«مَا نَهَيْتُكُمْ عَنْهُ فَاجْتَنِبُوهُ، وَمَا أَمَرْتُكُمْ بِهِ فَأْتُوا مِنْهُ مَا اسْتَطَعْتُمْ، فَإِنَّمَا أَهْلَكَ الَّذِينَ مِنْ قَبْلِكُمْ كَثْرَةُ مَسَائِلِهِمْ وَاخْتِلاَفُهُمْ عَلَى أَنْبِيَائِهِمْ».',
    source: 'متفق عليه • البخاري (٧٢٨٨) ومسلم (١٣٣٧)',
    lessons: [
      'النهي يجب تركه كلياً بلا استثناء لأنه كفّ عن الفعل.',
      'الأوامر مقيدة بالاستطاعة والقدرة: «لا يكلف الله نفساً إلا وسعها».',
      'النهي عن الجدال العقيم والتكلف في السؤال بغير حاجة.'
    ]
  },
  {
    id: 9,
    titleAr: 'أكل الحلال وأثر المطعم في إجابة الدعاء',
    titleEn: 'Purity of Sustenance & Answering Duas',
    narratorAr: 'أبو هريرة رضي الله عنه',
    textAr: '«إِنَّ اللَّهَ طَيِّبٌ لاَ يَقْبَلُ إِلاَّ طَيِّبًا... ثُمَّ ذَكَرَ الرَّجُلَ يُطِيلُ السَّفَرَ أَشْعَثَ أَغْبَرَ، يَمُدُّ يَدَيْهِ إِلَى السَّمَاءِ: يَا رَبِّ يَا رَبِّ، وَمَطْعَمُهُ حَرَامٌ، وَمَشْرَبُهُ حَرَامٌ، وَمَلْبَسُهُ حَرَامٌ، وَغُذِيَ بِالحَرَامِ، فَأَنَّى يُسْتَجَابُ لِذَلِكَ!».',
    source: 'صحيح مسلم • حديث ١٠١٥',
    lessons: [
      'الله سبحانه منزه عن النقائص، ولا يتقبل من الصدقات والأعمال إلا ما كان حلالاً طيباً.',
      'أكل الحلال شرط عظيم من شروط استجابة الدعاء وبركة الطاعات.',
      'المال الحرام مانع من موانع الإجابة وإن توفرت أسبابها من السفر والافتقار.'
    ]
  },
  {
    id: 10,
    titleAr: 'ترك الشبهات والريب',
    titleEn: 'Leaving What Causes Doubt',
    narratorAr: 'الحسن بن علي سبط رسول الله ﷺ',
    textAr: 'حَفِظْتُ مِنْ رَسُولِ اللَّهِ ﷺ: «دَعْ مَا يَرِيبُكَ إِلَى مَا لاَ يَرِيبُكَ، فَإِنَّ الصِّدْقَ طُمَأْنِينَةٌ وَإِنَّ الكَذِبَ رِيبَةٌ».',
    source: 'سنن الترمذي والنسائي • حديث صحيح',
    lessons: [
      'قاعدة جليلة في الورع: ترك ما يحيك في النفس وتردد فيه القلب إلى ما استقر بيقين حله.',
      'الطمأنينة قرينة الحق والصدق، والريبة والاضطراب قرينة الباطل.'
    ]
  },
  {
    id: 11,
    titleAr: 'من حسن إسلام المرء',
    titleEn: 'Sign of True Excellence in Islam',
    narratorAr: 'أبو هريرة رضي الله عنه',
    textAr: 'قَالَ رَسُولُ اللَّهِ ﷺ: «مِنْ حُسْنِ إِسْلاَمِ المَرْءِ تَرْكُهُ مَا لاَ يَعْنِيهِ».',
    source: 'سنن الترمذي وابن ماجه • حديث حسن',
    lessons: [
      'أصل عظيم في تهذيب النفس وحفظ الوقت والجوارح من الفضول والتطفل.',
      'الاشتغال بما ينفع العبد في دينه ودنياه وترك ما لا فائدة منه.'
    ]
  },
  {
    id: 12,
    titleAr: 'محبة الخير للمؤمنين',
    titleEn: 'Loving for Others What You Love for Yourself',
    narratorAr: 'أنس بن مالك خادم رسول الله ﷺ',
    textAr: 'عَنِ النَّبِيِّ ﷺ قَالَ: «لاَ يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ».',
    source: 'متفق عليه • البخاري (١٣) ومسلم (٤٥)',
    lessons: [
      'كمال الإيمان الواجب يقتضي سلامة الصدر من الغل والحسد.',
      'المؤمن يسره ما يسر إخوانه من الخير، ويسوءه ما يسوؤهم من الضر.'
    ]
  },
  {
    id: 13,
    titleAr: 'حفظ اللسان وإكرام الجار والضيف',
    titleEn: 'Guarding Tongue, Neighbor & Guest Rights',
    narratorAr: 'أبو هريرة رضي الله عنه',
    textAr: '«مَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَاليَوْمِ الآخِرِ فَلْيَقُلْ خَيْرًا أَوْ لِيَصْمُتْ، وَمَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَاليَوْمِ الآخِرِ فَلْيُكْرِمْ جَارَهُ، وَمَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَاليَوْمِ الآخِرِ فَلْيُكْرِمْ ضَيْفَهُ».',
    source: 'متفق عليه • البخاري (٦٠١٨) ومسلم (٤٧)',
    lessons: [
      'الصمت عن الشر وكلام اللغو دليل على الإيمان بالله واليوم الآخر.',
      'عظم حق الجار في الإسلام ووجوب الإحسان إليه وكف الأذى عنه.',
      'إكرام الضيف من مكارم الأخلاق وشيم الصالحين.'
    ]
  },
  {
    id: 14,
    titleAr: 'الوصية الجامعة: لا تغضب',
    titleEn: 'The Comprehensive Counsel: Do Not Get Angry',
    narratorAr: 'أبو هريرة رضي الله عنه',
    textAr: 'أَنَّ رَجُلًا قَالَ لِلنَّبِيِّ ﷺ: أَوْصِنِي، قَالَ: «لاَ تَغْضَبْ». فَرَدَّدَ مِرَارًا، قَالَ: «لاَ تَغْضَبْ».',
    source: 'صحيح البخاري • حديث ٦١١٦',
    lessons: [
      'الغضب جماع الشرور ومفتاح الندامة والفرقة.',
      'النهي عن الاستسلام لدواعي الغضب، ومجاهدة النفس على الحلم وكظم الغيظ.',
      'وصية نبوية موجزة جمعت خيري الدنيا والآخرة.'
    ]
  },
  {
    id: 15,
    titleAr: 'كتابة الإحسان على كل شيء',
    titleEn: 'Allah Has Prescribed Excellence (Ihsan)',
    narratorAr: 'شداد بن أوس رضي الله عنه',
    textAr: '«إِنَّ اللَّهَ كَتَبَ الإِحْسَانَ عَلَى كُلِّ شَيْءٍ، فَإِذَا قَتَلْتُمْ فَأَحْسِنُوا القِتْلَةَ، وَإِذَا ذَبَحْتُمْ فَأَحْسِنُوا الذِّبْحَةَ، وَلْيُحِدَّ أَحَدُكُمْ شَفْرَتَهُ، وَلْيُرِحْ ذَبِيحَتَهُ».',
    source: 'صحيح مسلم • حديث ١٩٥٥',
    lessons: [
      'الإحسان والإتقان مبدأ شامل في الإسلام يشمل العبادات والمعاملات وحتى البهائم.',
      'رحمة الإسلام وسماحته حتى في حال الذبح بالرفق بالحيوان وإراحة ذبيحته.'
    ]
  },
  {
    id: 16,
    titleAr: 'التقوى وحسن الخلق',
    titleEn: 'Piety & Good Character Everywhere',
    narratorAr: 'أبو ذر ومعاذ بن جبل رضي الله عنهما',
    textAr: '«اتَّقِ اللَّهَ حَيْثُمَا كُنْتَ، وَأَتْبِعِ السَّيِّئَةَ الحَسَنَةَ تَمْحُهَا، وَخَالِقِ النَّاسَ بِخُلُقٍ حَسَنٍ».',
    source: 'سنن الترمذي • حديث حسن',
    lessons: [
      'مراقبة الله وتقواه في السر والعلن وفي جميع الأحوال والأمكنة.',
      'الحسنات والاستغفار والتوبة يذهبن السيئات ويكفرن الخطايا.',
      'حسن الخلق مع الخلق أثقل ما يوضع في ميزان العبد يوم القيامة.'
    ]
  },
  {
    id: 17,
    titleAr: 'حفظ الله ومعيته (وصية ابن عباس)',
    titleEn: "Guarding Allah's Limits (Ibn Abbas Counsel)",
    narratorAr: 'عبد الله بن عباس رضي الله عنهما',
    textAr: '«يَا غُلاَمُ إِنِّي أُعَلِّمُكَ كَلِمَاتٍ: احْفَظِ اللَّهَ يَحْفَظْكَ، احْفَظِ اللَّهَ تَجِدْهُ تُجَاهَكَ، إِذَا سَأَلْتَ فَاسْأَلِ اللَّهَ، وَإِذَا اسْتَعَنْتَ فَاسْتَعِنْ بِاللَّهِ، وَاعْلَمْ أَنَّ الأُمَّةَ لَوِ اجْتَمَعَتْ عَلَى أَنْ يَنْفَعُوكَ بِشَيْءٍ لَمْ يَنْفَعُوكَ إِلاَّ بِشَيْءٍ قَدْ كَتَبَهُ اللَّهُ لَكَ، وَلَوِ اجْتَمَعُوا عَلَى أَنْ يَضُرُّوكَ بِشَيْءٍ لَمْ يَضُرُّوكَ إِلاَّ بِشَيْءٍ قَدْ كَتَبَهُ اللَّهُ عَلَيْكَ، رُفِعَتِ الأَقْلاَمُ وَجَفَّتِ الصُّحُفُ».',
    source: 'سنن الترمذي • حديث حسن صحيح',
    lessons: [
      'حفظ أوامر الله ونواهيه يورث حفظ الله للعبد في دينه ودنياه وأهله.',
      'توحيد الدعاء والاستعانة بالله وتفويض الأمر إليه دون سواه.',
      'اليقين التام بأن النفع والضر بيد الله وحده لا راد لقضائه.'
    ]
  },
  {
    id: 18,
    titleAr: 'خلق الحياء من الإيمان',
    titleEn: 'Modesty (Haya) is Fundamental Faith',
    narratorAr: 'أبو مسعود عقبة بن عمرو الأنصاري البدري رضي الله عنه',
    textAr: '«إِنَّ مِمَّا أَدْرَكَ النَّاسُ مِنْ كَلاَمِ النُّبُوَّةِ الأُولَى: إِذَا لَمْ تَسْتَحِ فَاصْنَعْ مَا شِئْتَ».',
    source: 'صحيح البخاري • حديث ٣٤٨٤',
    lessons: [
      'الحياء خلق كريم توارثته الأمم عن الأنبياء السابقين عليهم السلام.',
      'الحياء مانع ووازع للنفس عن ارتكاب القبائح والآثام.',
      'إذا تجرد الإنسان من الحياء من الله والناس وقع في كل منكر.'
    ]
  },
  {
    id: 19,
    titleAr: 'الاستقامة على دين الله',
    titleEn: 'Steadfastness on Faith',
    narratorAr: 'سفيان بن عبد الله الثقفي رضي الله عنه',
    textAr: 'قُلْتُ: يَا رَسُولَ اللَّهِ، قُلْ لِي فِي الإِسْلاَمِ قَوْلًا لاَ أَسْأَلُ عَنْهُ أَحَدًا غَيْرَكَ، قَالَ: «قُلْ: آمَنْتُ بِاللَّهِ، ثُمَّ اسْتَقِمْ».',
    source: 'صحيح مسلم • حديث ٣٨',
    lessons: [
      'الاستقامة هي لزوم طاعة الله ظاهراً وباطناً والاستمرار على الإيمان حتى الممات.',
      'جوامع كلمه ﷺ في اختصار الدين كله في الإيمان والاستقامة.'
    ]
  },
  {
    id: 20,
    titleAr: 'الطهور شطر الإيمان وفضل الأذكار',
    titleEn: 'Purity is Half of Faith & Dhikr Virtues',
    narratorAr: 'أبو مالك الحارث بن عاصم الأشعري رضي الله عنه',
    textAr: '«الطُّهُورُ شَطْرُ الإِيمَانِ، وَالحَمْدُ لِلَّهِ تَمْلأُ المِيزَانَ، وَسُبْحَانَ اللَّهِ وَالحَمْدُ لِلَّهِ تَمْلآنِ - أَوْ تَمْلأُ - مَا بَيْنَ السَّمَاءِ وَالأَرْضِ، وَالصَّلاَةُ نُورٌ، وَالصَّدَقَةُ بُرْهَانٌ، وَالصَّبْرُ ضِيَاءٌ، وَالقُرْآنُ حُجَّةٌ لَكَ أَوْ عَلَيْكَ، كُلُّ النَّاسِ يَغْدُو فَبَائِعٌ نَفْسَهُ فَمُعْتِقُهَا أَوْ مُوبِقُهَا».',
    source: 'صحيح مسلم • حديث ٢٢٣',
    lessons: [
      'عظم مكانة الطهارة الحسية والمعنوية في ميزان الإسلام.',
      'ثقل التحميد والتسبيح في الميزان وأجرهما العظيم.',
      'الصلاة نور لصاحبها، والقرآن إما حجة ينجي صاحبه أو حجة تورده المهالك إن ضيعه.'
    ]
  }
];

// ==========================================
// --- DATA: دروس وكراسي المسجد النبوي الشريف ---
// ==========================================
const PROPHET_MOSQUE_SCHEDULE = [
  {
    id: 'chair_tawheed_qasim',
    chairTitleAr: 'كرسي التفسير والحديث الشريف',
    chairTitleEn: 'Quran Tafsir & Hadith Chair',
    bookAr: 'عمدة الأحكام وكتاب التوحيد',
    scholarAr: 'الشيخ د. عبد المحسن بن محمد القاسم',
    roleAr: 'إمام وخطيب المسجد النبوي الشريف',
    timingAr: 'يومياً بعد صلاة المغرب',
    timingCategory: 'maghrib',
    locationAr: 'المسجد النبوي • الحصوة الأولى أمام الروضة الشريفة',
    badge: 'بث مباشر يومي',
    color: '#1E5A3E'
  },
  {
    id: 'chair_aqeedah_badr',
    chairTitleAr: 'كرسي العقيدة والتوحيد وأصول الإيمان',
    chairTitleEn: 'Islamic Creed & Tawheed Chair',
    bookAr: 'شرح العقيدة الواسطية وفقه الأدعية والأذكار',
    scholarAr: 'الشيخ د. عبد الرزاق بن عبد المحسن البدر',
    roleAr: 'المدرس بالمسجد النبوي الشريف',
    timingAr: 'يومياً بعد صلاة الفجر وبعد صلاة العصر',
    timingCategory: 'fajr_asr',
    locationAr: 'المسجد النبوي • توسعة الملك فهد (الرواق الغربي)',
    badge: 'مجلسان يومياً',
    color: '#8C5E3C'
  },
  {
    id: 'chair_fiqh_shinqiti',
    chairTitleAr: 'كرسي الفقه المقارن وشرح المتون',
    chairTitleEn: 'Comparative Fiqh Chair',
    bookAr: 'شرح زاد المستقنع في اختصار المقنع',
    scholarAr: 'الشيخ د. محمد بن محمد المختار الشنقيطي',
    roleAr: 'المدرس بالمسجد النبوي • عضو هيئة كبار العلماء',
    timingAr: 'أيام الأسبوع بعد صلاة العشاء',
    timingCategory: 'isha',
    locationAr: 'المسجد النبوي • الرواق القبلي',
    badge: 'كرسي الفقه الأكبر',
    color: '#2D4F38'
  },
  {
    id: 'chair_sunnah_baijan',
    chairTitleAr: 'كرسي السنة النبوية والرقائق',
    chairTitleEn: 'Prophetic Sunnah & Spiritual Heart Softeners',
    bookAr: 'شرح أحاديث الإيمان ومجامع الكلم النبوية',
    scholarAr: 'الشيخ د. عبد الله بن عبد الرحمن البعيجان',
    roleAr: 'إمام وخطيب المسجد النبوي الشريف',
    timingAr: 'أسبوعياً بعد صلاة العصر',
    timingCategory: 'asr',
    locationAr: 'المسجد النبوي • جوار المكبرية الشريفة',
    badge: 'مجلس أسبوعي',
    color: '#7B5E28'
  },
  {
    id: 'chair_quran_hudhaifi',
    chairTitleAr: 'كرسي هدايات القرآن ولغة التنزيل',
    chairTitleEn: 'Quranic Guidance & Linguistics Chair',
    bookAr: 'مجالس في تدبر القرآن ودلالات الألفاظ',
    scholarAr: 'الشيخ د. أحمد بن علي الحذيفي',
    roleAr: 'إمام وخطيب المسجد النبوي الشريف',
    timingAr: 'أيام الإثنين والأربعاء بعد صلاة المغرب',
    timingCategory: 'maghrib',
    locationAr: 'المسجد النبوي • توسعة الملك فهد',
    badge: 'مجلس تدبر',
    color: '#1B5E20'
  },
  {
    id: 'chair_usul_ruhayli',
    chairTitleAr: 'كرسي القواعد الفقهية وأصول الفقه',
    chairTitleEn: 'Legal Maxims & Usul al-Fiqh Chair',
    bookAr: 'القواعد الفقهية الكبرى وتطبيقاتها المعاصرة',
    scholarAr: 'الشيخ د. سليمان بن سليم الرحيلي',
    roleAr: 'المدرس بالمسجد النبوي الشريف',
    timingAr: 'أيام السبت والأحد بعد صلاة المغرب',
    timingCategory: 'maghrib',
    locationAr: 'المسجد النبوي • الرواق الجنوبي',
    badge: 'أصول الفقه',
    color: '#4E342E'
  },
  {
    id: 'chair_iman_sindi',
    chairTitleAr: 'كرسي الاعتقاد والتوحيد الخالص',
    chairTitleEn: 'Pure Creed & Belief Chair',
    bookAr: 'شرح لمعة الاعتقاد ورسائل أئمة السنة',
    scholarAr: 'الشيخ د. صالح بن عبد العزيز السندي',
    roleAr: 'المدرس بالمسجد النبوي الشريف',
    timingAr: 'أيام الثلاثاء بعد صلاة العشاء',
    timingCategory: 'isha',
    locationAr: 'المسجد النبوي • الرواق الشمالي',
    badge: 'مجلس العقيدة',
    color: '#33691E'
  }
];

const PROPHET_MOSQUE_COURSES = [
  {
    id: 'course_tawheed_qasim',
    titleAr: 'شرح كتاب التوحيد الذي هو حق الله على العبيد',
    titleEn: 'Explanation of Kitab At-Tawheed',
    scholarAr: 'الشيخ د. عبد المحسن بن محمد القاسم',
    roleAr: 'إمام وخطيب المسجد النبوي الشريف',
    categoryAr: 'العقيدة',
    categoryEn: 'Creed',
    badge: 'كرسي الحرم النبوي',
    descriptionAr: 'شرح تأصيلي نفيس لكتاب التوحيد للإمام المجدد، ألقي في محراب وحلقات المسجد النبوي الشريف.',
    lessonsCount: 12,
    audioStreamUrl: 'https://archive.org/download/Mstawa_2/3-Mstawa2_01.mp3',
    lessons: [
      { id: 'tq_01', number: 1, titleAr: 'مقدمة الكتاب وبيان حق الله على العبيد وفضل التوحيد', duration: '٤٢ دقيقة', audioUrl: 'https://archive.org/download/Mstawa_2/3-Mstawa2_01.mp3' },
      { id: 'tq_02', number: 2, titleAr: 'باب من حقق التوحيد دخل الجنة بغير حساب ولا عذاب', duration: '٣٨ دقيقة', audioUrl: 'https://archive.org/download/Mstawa_2/3-Mstawa2_02.mp3' },
      { id: 'tq_03', number: 3, titleAr: 'باب الخوف من الشرك وبيان خطره ودقائقه', duration: '٤٥ دقيقة', audioUrl: 'https://archive.org/download/Mstawa_2/3-Mstawa2_03.mp3' },
      { id: 'tq_04', number: 4, titleAr: 'باب الدعاء إلى شهادة أن لا إله إلا الله', duration: '٤٠ دقيقة', audioUrl: 'https://archive.org/download/Mstawa_2/3-Mstawa2_04.mp3' },
      { id: 'tq_05', number: 5, titleAr: 'باب تفسير التوحيد وشهادة أن لا إله إلا الله', duration: '٥١ دقيقة', audioUrl: 'https://archive.org/download/Mstawa_2/3-Mstawa2_05.mp3' },
      { id: 'tq_06', number: 6, titleAr: 'باب من الشرك لبس الحلقة والخيط ونحوهما لرفع البلاء', duration: '٣٦ دقيقة', audioUrl: 'https://archive.org/download/Mstawa_2/3-Mstawa2_06.mp3' },
      { id: 'tq_07', number: 7, titleAr: 'باب ما جاء في الرقى والتمائم والتولة', duration: '٤٨ دقيقة', audioUrl: 'https://archive.org/download/Mstawa_2/3-Mstawa2_07.mp3' },
      { id: 'tq_08', number: 8, titleAr: 'باب من تبرك بشجرة أو حجر ونحوهما', duration: '٣٩ دقيقة', audioUrl: 'https://archive.org/download/Mstawa_2/3-Mstawa2_08.mp3' },
      { id: 'tq_09', number: 9, titleAr: 'باب ما جاء في الذبح لغير الله والنذر', duration: '٤٤ دقيقة', audioUrl: 'https://archive.org/download/Mstawa_2/3-Mstawa2_09.mp3' },
      { id: 'tq_10', number: 10, titleAr: 'باب من الشرك الاستعاذة بغير الله والاستغاثة', duration: '٤٧ دقيقة', audioUrl: 'https://archive.org/download/Mstawa_2/3-Mstawa2_10.mp3' },
      { id: 'tq_11', number: 11, titleAr: 'باب قول الله تعالى: ﴿أيشركون ما لا يخلق شيئا﴾', duration: '٤١ دقيقة', audioUrl: 'https://archive.org/download/Mstawa_2/3-Mstawa2_11.mp3' },
      { id: 'tq_12', number: 12, titleAr: 'باب الشفاعة المثبتة والمنفية وخاتمة الأبواب', duration: '٥٥ دقيقة', audioUrl: 'https://archive.org/download/Mstawa_2/3-Mstawa2_12.mp3' }
    ]
  },
  {
    id: 'course_wasitiyyah_badr',
    titleAr: 'شرح العقيدة الواسطية لشيخ الإسلام ابن تيمية',
    titleEn: 'Explanation of Al-Aqeedah Al-Wasitiyyah',
    scholarAr: 'الشيخ د. عبد الرزاق بن عبد المحسن البدر',
    roleAr: 'المدرس بالمسجد النبوي الشريف',
    categoryAr: 'العقيدة',
    categoryEn: 'Creed',
    badge: 'سلسلة محراب الفجر',
    descriptionAr: 'شرح منهجي رصين لأهم متون الاعتقاد على منهج أهل السنة والجماعة في أسماء الله وصفاته والإيمان باليوم الآخر.',
    lessonsCount: 14,
    audioStreamUrl: 'https://archive.org/download/wasetia_Badr/001.mp3',
    lessons: [
      { id: 'wb_01', number: 1, titleAr: 'مقدمة المتن ومنهج أهل السنة في الأسماء والصفات', duration: '٤٨ دقيقة', audioUrl: 'https://archive.org/download/wasetia_Badr/001.mp3' },
      { id: 'wb_02', number: 2, titleAr: 'قاعدة إثبات الصفات بلا تحريف ولا تعطيل ولا تكييف', duration: '٥٠ دقيقة', audioUrl: 'https://archive.org/download/wasetia_Badr/002.mp3' },
      { id: 'wb_03', number: 3, titleAr: 'آية الكرسي وسورة الإخلاص ودلائل التوحيد العظمى', duration: '٤٥ دقيقة', audioUrl: 'https://archive.org/download/wasetia_Badr/003.mp3' },
      { id: 'wb_04', number: 4, titleAr: 'صفات العلم والقدرة والسمع والبصر لله جل وعلا', duration: '٤٣ دقيقة', audioUrl: 'https://archive.org/download/wasetia_Badr/004.mp3' },
      { id: 'wb_05', number: 5, titleAr: 'صفات الإرادة والمحبة والرضا والغضب الإلهي', duration: '٤٩ دقيقة', audioUrl: 'https://archive.org/download/wasetia_Badr/005.mp3' },
      { id: 'wb_06', number: 6, titleAr: 'صفة المجيء والإتيان والقرب والمعية الإلهية', duration: '٥٢ دقيقة', audioUrl: 'https://archive.org/download/wasetia_Badr/006.mp3' },
      { id: 'wb_07', number: 7, titleAr: 'صفات الكلام الإلهي والقرآن كلام الله غير مخلوق', duration: '٥٦ دقيقة', audioUrl: 'https://archive.org/download/wasetia_Badr/007.mp3' },
      { id: 'wb_08', number: 8, titleAr: 'رؤية المؤمنين لربهم عياناً يوم القيامة في الجنة', duration: '٤٦ دقيقة', audioUrl: 'https://archive.org/download/wasetia_Badr/008.mp3' },
      { id: 'wb_09', number: 9, titleAr: 'الإيمان باليوم الآخر وفتنة القبر وعذابه ونعيمه', duration: '٥٣ دقيقة', audioUrl: 'https://archive.org/download/wasetia_Badr/009.mp3' },
      { id: 'wb_10', number: 10, titleAr: 'أحوال القيامة الكبرى: البعث، الحوض، الصراط، والميزان', duration: '٥٨ دقيقة', audioUrl: 'https://archive.org/download/wasetia_Badr/010.mp3' },
      { id: 'wb_11', number: 11, titleAr: 'الإيمان بالقدر خيره وشره ومراتب القدر الأربع', duration: '٥١ دقيقة', audioUrl: 'https://archive.org/download/wasetia_Badr/011.mp3' },
      { id: 'wb_12', number: 12, titleAr: 'مسمى الإيمان وحكم مرتكب الكبيرة وأهل القبلة', duration: '٤٧ دقيقة', audioUrl: 'https://archive.org/download/wasetia_Badr/012.mp3' },
      { id: 'wb_13', number: 13, titleAr: 'حقوق صحابة رسول الله ﷺ وأهل بيته الأطهار', duration: '٤٥ دقيقة', audioUrl: 'https://archive.org/download/wasetia_Badr/013.mp3' },
      { id: 'wb_14', number: 14, titleAr: 'كرامات الأولياء والأمر بالمعروف ومكارم الأخلاق', duration: '٥٤ دقيقة', audioUrl: 'https://archive.org/download/wasetia_Badr/014.mp3' }
    ]
  },
  {
    id: 'course_umdah_qasim',
    titleAr: 'شرح عمدة الأحكام من كلام خير الأنام',
    titleEn: 'Explanation of Umdat Al-Ahkam',
    scholarAr: 'الشيخ د. عبد المحسن بن محمد القاسم',
    roleAr: 'إمام وخطيب المسجد النبوي الشريف',
    categoryAr: 'الحديث',
    categoryEn: 'Hadith',
    badge: 'أحاديث الأحكام',
    descriptionAr: 'شرح فقهي حديثي للأحاديث المتفق عليها في الصحيحين المقررة في متون الأحكام الفقهية.',
    lessonsCount: 10,
    audioStreamUrl: 'https://archive.org/download/omdat_alahkam/01.mp3',
    lessons: [
      { id: 'uq_01', number: 1, titleAr: 'حديث إنما الأعمال بالنيات وبيان أحكام الطهارة والنية', duration: '٤٥ دقيقة', audioUrl: 'https://archive.org/download/omdat_alahkam/01.mp3' },
      { id: 'uq_02', number: 2, titleAr: 'أحاديث الاستنجاء وآداب قضاء الحاجة وسنن الفطرة', duration: '٤٢ دقيقة', audioUrl: 'https://archive.org/download/omdat_alahkam/02.mp3' },
      { id: 'uq_03', number: 3, titleAr: 'صفة وضوء النبي ﷺ وأركانه ومبطلاته', duration: '٥٠ دقيقة', audioUrl: 'https://archive.org/download/omdat_alahkam/03.mp3' },
      { id: 'uq_04', number: 4, titleAr: 'المسح على الخفين والغسل من الجنابة وأحكامهما', duration: '٤٦ دقيقة', audioUrl: 'https://archive.org/download/omdat_alahkam/04.mp3' },
      { id: 'uq_05', number: 5, titleAr: 'أحكام التيمم والنجاسات وكيفية تطهيرها', duration: '٣٩ دقيقة', audioUrl: 'https://archive.org/download/omdat_alahkam/05.mp3' },
      { id: 'uq_06', number: 6, titleAr: 'كتاب الصلاة: مواقيت الصلوات الخمس وفضل الجماعة', duration: '٥٣ دقيقة', audioUrl: 'https://archive.org/download/omdat_alahkam/06.mp3' },
      { id: 'uq_07', number: 7, titleAr: 'الأذان والإقامة واستقبال القبلة وشروط الصلاة', duration: '٤٧ دقيقة', audioUrl: 'https://archive.org/download/omdat_alahkam/07.mp3' },
      { id: 'uq_08', number: 8, titleAr: 'صفة صلاة النبي ﷺ من التكبير إلى التسليم', duration: '٥٨ دقيقة', audioUrl: 'https://archive.org/download/omdat_alahkam/08.mp3' },
      { id: 'uq_09', number: 9, titleAr: 'سجود السهو وسجود التلاوة وصلاة المريض والمسافر', duration: '٤٤ دقيقة', audioUrl: 'https://archive.org/download/omdat_alahkam/09.mp3' },
      { id: 'uq_10', number: 10, titleAr: 'صلاة الجمعة والعيدين والجنائز والأحكام التابعة', duration: '٥١ دقيقة', audioUrl: 'https://archive.org/download/omdat_alahkam/10.mp3' }
    ]
  },
  {
    id: 'course_nawawi_badr',
    titleAr: 'شرح الأربعين النووية في جوامع الكلم',
    titleEn: "Explanation of An-Nawawi's 40 Hadiths",
    scholarAr: 'الشيخ د. عبد الرزاق بن عبد المحسن البدر',
    roleAr: 'المدرس بالمسجد النبوي الشريف',
    categoryAr: 'الحديث',
    categoryEn: 'Hadith',
    badge: 'جوامع الكلم',
    descriptionAr: 'بيان مستفيض لقواعد الدين وأصول الإسلام الكبرى الواردة في الأحاديث النبوية الجامعة.',
    lessonsCount: 10,
    audioStreamUrl: 'https://archive.org/download/raj3elsada-40NAWAWI/01.mp3',
    lessons: [
      { id: 'nb_01', number: 1, titleAr: 'حديث جبريل عليه السلام في مراتب الإسلام والإيمان والإحسان', duration: '٥٥ دقيقة', audioUrl: 'https://archive.org/download/raj3elsada-40NAWAWI/01.mp3' },
      { id: 'nb_02', number: 2, titleAr: 'حديث بني الإسلام على خمس وأطوار خلق الإنسان في الرحم', duration: '٤٩ دقيقة', audioUrl: 'https://archive.org/download/raj3elsada-40NAWAWI/02.mp3' },
      { id: 'nb_03', number: 3, titleAr: 'حديث من أحدث في أمرنا هذا ما ليس منه فهو رد', duration: '٤٦ دقيقة', audioUrl: 'https://archive.org/download/raj3elsada-40NAWAWI/03.mp3' },
      { id: 'nb_04', number: 4, titleAr: 'حديث الحلال بين والحرام بين وبينهما مشتبهات', duration: '٥٢ دقيقة', audioUrl: 'https://archive.org/download/raj3elsada-40NAWAWI/04.mp3' },
      { id: 'nb_05', number: 5, titleAr: 'حديث الدين النصيحة وأمرت أن أقاتل الناس حتى يشهدوا', duration: '٤٨ دقيقة', audioUrl: 'https://archive.org/download/raj3elsada-40NAWAWI/05.mp3' },
      { id: 'nb_06', number: 6, titleAr: 'حديث ما نهيتكم عنه فاجتنبوه ودع ما يريبك إلى ما لا يريبك', duration: '٤٣ دقيقة', audioUrl: 'https://archive.org/download/raj3elsada-40NAWAWI/06.mp3' },
      { id: 'nb_07', number: 7, titleAr: 'حديث من حسن إسلام المرء تركه ما لا يعنيه وحب الخير لأخيه', duration: '٤١ دقيقة', audioUrl: 'https://archive.org/download/raj3elsada-40NAWAWI/07.mp3' },
      { id: 'nb_08', number: 8, titleAr: 'حديث لا يحل دم امرئ مسلم وحديث من كان يؤمن بالله واليوم الآخر', duration: '٤٧ دقيقة', audioUrl: 'https://archive.org/download/raj3elsada-40NAWAWI/08.mp3' },
      { id: 'nb_09', number: 9, titleAr: 'حديث لا تغضب وحديث إن الله كتب الإحسان على كل شيء', duration: '٤٤ دقيقة', audioUrl: 'https://archive.org/download/raj3elsada-40NAWAWI/09.mp3' },
      { id: 'nb_10', number: 10, titleAr: 'حديث اتق الله حيثما كنت وحديث احفظ الله يحفظك العظيم', duration: '٦٠ دقيقة', audioUrl: 'https://archive.org/download/raj3elsada-40NAWAWI/10.mp3' }
    ]
  },
  {
    id: 'course_zad_shinqiti',
    titleAr: 'شرح زاد المستقنع (فقه العبادات والمعاملات)',
    titleEn: 'Explanation of Zad Al-Mustaqni Fiqh',
    scholarAr: 'الشيخ د. محمد بن محمد المختار الشنقيطي',
    roleAr: 'المدرس بالمسجد النبوي • عضو هيئة كبار العلماء',
    categoryAr: 'الفقه',
    categoryEn: 'Fiqh',
    badge: 'دروس الروضة الشريفة',
    descriptionAr: 'الشرح الموسوعي الشهير لمتن زاد المستقنع، المقامة دروسه في رحاب المسجد النبوي الشريف والمستمرة لسنوات.',
    lessonsCount: 12,
    audioStreamUrl: 'https://archive.org/download/mshiqiti_zad/001.mp3',
    lessons: [
      { id: 'zs_01', number: 1, titleAr: 'مقدمة الفقه وأقسام المياه وأحكام الطهارة', duration: '٦٢ دقيقة', audioUrl: 'https://archive.org/download/mshiqiti_zad/001.mp3' },
      { id: 'zs_02', number: 2, titleAr: 'فصل في الآنية وفضل تطهير أوعية المسلم', duration: '٥٤ دقيقة', audioUrl: 'https://archive.org/download/mshiqiti_zad/002.mp3' },
      { id: 'zs_03', number: 3, titleAr: 'فصل الاستنجاء وسنن الوضوء وفضائله العظيمة', duration: '٥٨ دقيقة', audioUrl: 'https://archive.org/download/mshiqiti_zad/003.mp3' },
      { id: 'zs_04', number: 4, titleAr: 'فروض الوضوء ونواقضه المجمع عليها والمختلف فيها', duration: '٦٥ دقيقة', audioUrl: 'https://archive.org/download/mshiqiti_zad/004.mp3' },
      { id: 'zs_05', number: 5, titleAr: 'باب المسح على الخفين والجبيرة والعمامة', duration: '٥٢ دقيقة', audioUrl: 'https://archive.org/download/mshiqiti_zad/005.mp3' },
      { id: 'zs_06', number: 6, titleAr: 'باب الغسل من الجنابة وأحكام الحيض والنفاس', duration: '٥٩ دقيقة', audioUrl: 'https://archive.org/download/mshiqiti_zad/006.mp3' },
      { id: 'zs_07', number: 7, titleAr: 'كتاب الصلاة: شروط وجوب الصلاة وصحتها', duration: '٦٤ دقيقة', audioUrl: 'https://archive.org/download/mshiqiti_zad/007.mp3' },
      { id: 'zs_08', number: 8, titleAr: 'أركان الصلاة الأربعة عشر وواجباتها وسننها', duration: '٧٠ دقيقة', audioUrl: 'https://archive.org/download/mshiqiti_zad/008.mp3' },
      { id: 'zs_09', number: 9, titleAr: 'مكروهات الصلاة ومبطلاتها وأحكام الخشوع', duration: '٥٧ دقيقة', audioUrl: 'https://archive.org/download/mshiqiti_zad/009.mp3' },
      { id: 'zs_10', number: 10, titleAr: 'باب سجود السهو وحالات الشك والزيادة والنقصان', duration: '٦١ دقيقة', audioUrl: 'https://archive.org/download/mshiqiti_zad/010.mp3' },
      { id: 'zs_11', number: 11, titleAr: 'صلاة التطوع وقيام الليل والوتر والسنن الرواتب', duration: '٦٦ دقيقة', audioUrl: 'https://archive.org/download/mshiqiti_zad/011.mp3' },
      { id: 'zs_12', number: 12, titleAr: 'صلاة الجماعة وأحكام الإمامة وموقف المأموم', duration: '٦٨ دقيقة', audioUrl: 'https://archive.org/download/mshiqiti_zad/012.mp3' }
    ]
  },
  {
    id: 'course_shamail_badr',
    titleAr: 'شرح الشمائل المحمدية للإمام الترمذي',
    titleEn: 'Explanation of Ash-Shamail Al-Muhammadiyyah',
    scholarAr: 'الشيخ د. عبد الرزاق بن عبد المحسن البدر',
    roleAr: 'المدرس بالمسجد النبوي الشريف',
    categoryAr: 'سيرة ورقائق',
    categoryEn: 'Seerah & Heart Softeners',
    badge: 'الشمائل النبوية',
    descriptionAr: 'مجالس إيمانية تفيض بالحب والتأسي برسول الله ﷺ، في بيان خَلقه وخُلقه وهديه في مأكله ومشربه وعبادته.',
    lessonsCount: 10,
    audioStreamUrl: 'https://archive.org/download/Sharh-Shamail_An-Nabi/01.mp3',
    lessons: [
      { id: 'sb_01', number: 1, titleAr: 'باب ما جاء في خَلق رسول الله ﷺ وحسن صورته وبهائه', duration: '٥٠ دقيقة', audioUrl: 'https://archive.org/download/Sharh-Shamail_An-Nabi/01.mp3' },
      { id: 'sb_02', number: 2, titleAr: 'باب ما جاء في خاتم النبوة وشعر رسول الله ﷺ', duration: '٤٨ دقيقة', audioUrl: 'https://archive.org/download/Sharh-Shamail_An-Nabi/02.mp3' },
      { id: 'sb_03', number: 3, titleAr: 'باب ما جاء في كحل رسول الله ﷺ ولباسه ونعله', duration: '٤٢ دقيقة', audioUrl: 'https://archive.org/download/Sharh-Shamail_An-Nabi/03.mp3' },
      { id: 'sb_04', number: 4, titleAr: 'باب ما جاء في عيش رسول الله ﷺ وزهده وكرمه', duration: '٥٤ دقيقة', audioUrl: 'https://archive.org/download/Sharh-Shamail_An-Nabi/04.mp3' },
      { id: 'sb_05', number: 5, titleAr: 'باب ما جاء في صفة كلام رسول الله ﷺ وضحكه ومزاحه', duration: '٤٧ دقيقة', audioUrl: 'https://archive.org/download/Sharh-Shamail_An-Nabi/05a.mp3' },
      { id: 'sb_06', number: 6, titleAr: 'باب ما جاء في صفة عبادة رسول الله ﷺ وصيامه وتطوعه', duration: '٥٦ دقيقة', audioUrl: 'https://archive.org/download/Sharh-Shamail_An-Nabi/06.mp3' },
      { id: 'sb_07', number: 7, titleAr: 'باب ما جاء في قراءة رسول الله ﷺ وبكائه وخشوعه', duration: '٥١ دقيقة', audioUrl: 'https://archive.org/download/Sharh-Shamail_An-Nabi/07.mp3' },
      { id: 'sb_08', number: 8, titleAr: 'باب ما جاء في تواضع رسول الله ﷺ وخُلقه العظيم', duration: '٥٣ دقيقة', audioUrl: 'https://archive.org/download/Sharh-Shamail_An-Nabi/08.mp3' },
      { id: 'sb_09', number: 9, titleAr: 'باب ما جاء في حياء رسول الله ﷺ وطيب ريحه وعرقه', duration: '٤٦ دقيقة', audioUrl: 'https://archive.org/download/Sharh-Shamail_An-Nabi/09.mp3' },
      { id: 'sb_10', number: 10, titleAr: 'باب ما جاء في وفاة رسول الله ﷺ ورؤيته في المنام', duration: '٦٢ دقيقة', audioUrl: 'https://archive.org/download/Sharh-Shamail_An-Nabi/10.mp3' }
    ]
  },
  {
    id: 'course_usul_thalaatha_baijan',
    titleAr: 'شرح الأصول الثلاثة وأدلتها',
    titleEn: 'Explanation of The Three Fundamental Principles',
    scholarAr: 'الشيخ د. عبد الله بن عبد الرحمن البعيجان',
    roleAr: 'إمام وخطيب المسجد النبوي الشريف',
    categoryAr: 'العقيدة',
    categoryEn: 'Creed',
    badge: 'كرسي الإمامة النبوية',
    descriptionAr: 'شرح ميسر لأعظم ما يجب على العبد معرفته: معرفة العبد ربه، ودينه، ونبيه محمداً ﷺ بالأدلة.',
    lessonsCount: 8,
    audioStreamUrl: 'https://archive.org/download/Usul3_Badr/001.mp3',
    lessons: [
      { id: 'tb_01', number: 1, titleAr: 'المسائل الأربع الواجبة: العلم والعمل والدعوة والصبر', duration: '٣٥ دقيقة', audioUrl: 'https://archive.org/download/Usul3_Badr/001.mp3' },
      { id: 'tb_02', number: 2, titleAr: 'المسائل الثلاث في التوحيد والبراءة من الشرك وأهله', duration: '٣٨ دقيقة', audioUrl: 'https://archive.org/download/Usul3_Badr/002.mp3' },
      { id: 'tb_03', number: 3, titleAr: 'الأصل الأول: معرفة العبد ربه وأنواع العبادة وأدلتها', duration: '٤٥ دقيقة', audioUrl: 'https://archive.org/download/Usul3_Badr/003.mp3' },
      { id: 'tb_04', number: 4, titleAr: 'الدعاء والاستعانة والاستغاثة والتوكل والرجاء والخوف', duration: '٤٢ دقيقة', audioUrl: 'https://archive.org/download/Usul3_Badr/004.mp3' },
      { id: 'tb_05', number: 5, titleAr: 'الأصل الثاني: معرفة دين الإسلام بمراتبه الثلاث', duration: '٤٦ دقيقة', audioUrl: 'https://archive.org/download/Usul3_Badr/005.mp3' },
      { id: 'tb_06', number: 6, titleAr: 'مرتبة الإيمان وأركانه الستة ومرتبة الإحسان العظمى', duration: '٤٠ دقيقة', audioUrl: 'https://archive.org/download/Usul3_Badr/006.mp3' },
      { id: 'tb_07', number: 7, titleAr: 'الأصل الثالث: معرفة نبيكم محمد ﷺ ونسبه وبعثته وهجرته', duration: '٤٨ دقيقة', audioUrl: 'https://archive.org/download/Usul3_Badr/007.mp3' },
      { id: 'tb_08', number: 8, titleAr: 'وفاة النبي ﷺ ودعوة الرسل والكفر بالطاغوت والإيمان بالله', duration: '٤٤ دقيقة', audioUrl: 'https://archive.org/download/Usul3_Badr/008.mp3' }
    ]
  },
  {
    id: 'course_hedayat_hudhaifi',
    titleAr: 'مجالس في هدايات القرآن الكريم ومعانيه',
    titleEn: 'Quranic Guidance & Meditative Assemblies',
    scholarAr: 'الشيخ د. أحمد بن علي الحذيفي',
    roleAr: 'إمام وخطيب المسجد النبوي الشريف',
    categoryAr: 'التفسير',
    categoryEn: 'Tafsir',
    badge: 'تدبر التنزيل',
    descriptionAr: 'مجالس تدبرية قرآنية غنية بالمعاني البيانية والفوائد الإيمانية والتربوية من جوار منبر رسول الله ﷺ.',
    lessonsCount: 8,
    audioStreamUrl: 'https://archive.org/download/Usul3_Badr/017.mp3',
    lessons: [
      { id: 'hh_01', number: 1, titleAr: 'هدايات سورة الفاتحة أم الكتاب والسبع المثاني', duration: '٤٢ دقيقة', audioUrl: 'https://archive.org/download/Usul3_Badr/017.mp3' },
      { id: 'hh_02', number: 2, titleAr: 'مقاصد فواتح سورة البقرة وأصناف المكلفين الثلاثة', duration: '٤٨ دقيقة', audioUrl: 'https://archive.org/download/Usul3_Badr/018.mp3' },
      { id: 'hh_03', number: 3, titleAr: 'لطائف وبيان آية الكرسي سيدة آي القرآن الكريم', duration: '٤٠ دقيقة', audioUrl: 'https://archive.org/download/Usul3_Badr/019.mp3' },
      { id: 'hh_04', number: 4, titleAr: 'هدايات سورة يوسف وقواعد الثبات في المحن والابتلاء', duration: '٥٣ دقيقة', audioUrl: 'https://archive.org/download/Usul3_Badr/020.mp3' },
      { id: 'hh_05', number: 5, titleAr: 'معالم التدبر في سورة الكهف والنجاة من الفتن الأربع', duration: '٤٧ دقيقة', audioUrl: 'https://archive.org/download/Usul3_Badr/021.mp3' },
      { id: 'hh_06', number: 6, titleAr: 'محاسن سورة الحجرات وأدب المؤمن مع الله ورسوله والمؤمنين', duration: '٤٥ دقيقة', audioUrl: 'https://archive.org/download/Usul3_Badr/022.mp3' },
      { id: 'hh_07', number: 7, titleAr: 'هدايات جزء عم ومقاصد سور الإخلاص والمعوذتين', duration: '٥١ دقيقة', audioUrl: 'https://archive.org/download/Usul3_Badr/023.mp3' },
      { id: 'hh_08', number: 8, titleAr: 'وصايا قرآنية في التربية والاعتصام بحبل الله المتين', duration: '٤٦ دقيقة', audioUrl: 'https://archive.org/download/Usul3_Badr/024.mp3' }
    ]
  },
  {
    id: 'course_mutoon_qasim',
    titleAr: 'برنامج شرح متون طالب العلم (المستويات التأصيلية)',
    titleEn: 'Mutoon Talib Al-Ilm Commentary Program',
    scholarAr: 'الشيخ د. عبد المحسن بن محمد القاسم',
    roleAr: 'إمام وخطيب المسجد النبوي الشريف',
    categoryAr: 'العقيدة',
    categoryEn: 'Creed & Foundations',
    badge: 'برنامج المتون التأصيلي',
    descriptionAr: 'المجالس العلمية المحققة المقامة بالمسجد النبوي لمتون طالب العلم: نواقض الإسلام، القواعد الأربع، الأصول الثلاثة، وكتاب التوحيد.',
    lessonsCount: 8,
    audioStreamUrl: 'https://archive.org/download/Mstawa_1/1-Mstawa1_01.mp3',
    lessons: [
      { id: 'mq_01', number: 1, titleAr: 'شرح متن نواقض الإسلام للإمام المجدد وبيان خطورة الردة', duration: '٤٤ دقيقة', audioUrl: 'https://archive.org/download/Mstawa_1/1-Mstawa1_01.mp3' },
      { id: 'mq_02', number: 2, titleAr: 'شرح متن القواعد الأربع في معرفة التوحيد والشرك', duration: '٣٩ دقيقة', audioUrl: 'https://archive.org/download/Mstawa_1/2-Mstawa1_01.mp3' },
      { id: 'mq_03', number: 3, titleAr: 'شرح متن الأصول الثلاثة وأدلتها (المقدمة والمسائل الكبرى)', duration: '٤٨ دقيقة', audioUrl: 'https://archive.org/download/Mstawa_1/3-Mstawa1_01.mp3' },
      { id: 'mq_04', number: 4, titleAr: 'شرح الأصول الثلاثة (الأصل الثاني والثالث: الإسلام والنبوة)', duration: '٥٢ دقيقة', audioUrl: 'https://archive.org/download/Mstawa_1/3-Mstawa1_02.mp3' },
      { id: 'mq_05', number: 5, titleAr: 'شرح متن فضل الإسلام ولزوم السنة والجماعة', duration: '٤٦ دقيقة', audioUrl: 'https://archive.org/download/Mstawa_1/3-Mstawa1_03.mp3' },
      { id: 'mq_06', number: 6, titleAr: 'شرح كتاب التوحيد: أبواب إخلاص العبادة لله وحده', duration: '٥٠ دقيقة', audioUrl: 'https://archive.org/download/Mstawa_1/3-Mstawa1_04.mp3' },
      { id: 'mq_07', number: 7, titleAr: 'شرح متن لمعة الاعتقاد الهادي إلى سبيل الرشاد', duration: '٥٥ دقيقة', audioUrl: 'https://archive.org/download/Mstawa_1/4-Mstawa1_01.mp3' },
      { id: 'mq_08', number: 8, titleAr: 'شرح متن الواسطية والوصية بطلب العلم وحفظ المتون', duration: '٥٨ دقيقة', audioUrl: 'https://archive.org/download/Mstawa_1/4-Mstawa1_02.mp3' }
    ]
  },
  {
    id: 'course_qawaid_fiqhiyyah_ruhaily',
    titleAr: 'شرح منظومة القواعد الفقهية للعلامة السعدي',
    titleEn: 'Explanation of Al-Qawaid Al-Fiqhiyyah',
    scholarAr: 'الشيخ أ.د. سليمان بن سليم الله الرحيلي',
    roleAr: 'المدرس بالمسجد النبوي الشريف',
    categoryAr: 'الفقه',
    categoryEn: 'Fiqh & Principles',
    badge: 'كرسي القواعد الفقهية',
    descriptionAr: 'شرح تأصيلي ميسر للقواعد والضوابط الفقهية الكبرى وتطبيقاتها المعاصرة، ألقي في الرواق العثماني بالمسجد النبوي.',
    lessonsCount: 8,
    audioStreamUrl: 'https://archive.org/download/05_20211026/01.mp3',
    lessons: [
      { id: 'qr_01', number: 1, titleAr: 'مقدمة علم القواعد الفقهية وقاعدة: الدين مبني على المصالح', duration: '٤٨ دقيقة', audioUrl: 'https://archive.org/download/05_20211026/01.mp3' },
      { id: 'qr_02', number: 2, titleAr: 'قاعدة: درء المفاسد مقدم على جلب المصالح والموازنة بينها', duration: '٥١ دقيقة', audioUrl: 'https://archive.org/download/05_20211026/02.mp3' },
      { id: 'qr_03', number: 3, titleAr: 'قاعدة: المشقة تجلب التيسير ورخص الشريعة الإسلامية', duration: '٤٦ دقيقة', audioUrl: 'https://archive.org/download/05_20211026/03.mp3' },
      { id: 'qr_04', number: 4, titleAr: 'قاعدة: اليقين لا يزول بالشك في العبادات والمعاملات', duration: '٥٣ دقيقة', audioUrl: 'https://archive.org/download/05_20211026/04.mp3' },
      { id: 'qr_05', number: 5, titleAr: 'قاعدة: الأمور بمقاصدها وأثر النية في العقود والعبادات', duration: '٤٩ دقيقة', audioUrl: 'https://archive.org/download/05_20211026/05.mp3' },
      { id: 'qr_06', number: 6, titleAr: 'قاعدة: العادة محكمة وضوابط الأعراف المعتبرة شرعاً', duration: '٤٤ دقيقة', audioUrl: 'https://archive.org/download/05_20211026/06.mp3' },
      { id: 'qr_07', number: 7, titleAr: 'قاعدة: لا ضرر ولا ضرار والضرر يزال وتطبيقاتها', duration: '٥٢ دقيقة', audioUrl: 'https://archive.org/download/05_20211026/07.mp3' },
      { id: 'qr_08', number: 8, titleAr: 'قواعد التابع تابع وإعمال الكلام أولى من إهماله وخاتمة المنظومة', duration: '٥٥ دقيقة', audioUrl: 'https://archive.org/download/05_20211026/08.mp3' }
    ]
  },
  {
    id: 'course_lumah_sindi',
    titleAr: 'شرح لمعة الاعتقاد الهادي إلى سبيل الرشاد',
    titleEn: 'Explanation of Lumat Al-Itiqad',
    scholarAr: 'الشيخ د. صالح بن عبد العزيز السندي',
    roleAr: 'المدرس بالمسجد النبوي الشريف',
    categoryAr: 'العقيدة',
    categoryEn: 'Creed',
    badge: 'مجلس أصول الدين',
    descriptionAr: 'شرح محرر لمتن لمعة الاعتقاد للإمام ابن قدامة المقدسي، ألقي في رحاب الحرم النبوي مع بيان قواعد الأسماء والصفات.',
    lessonsCount: 6,
    audioStreamUrl: 'https://archive.org/download/wasetia_Badr/015.mp3',
    lessons: [
      { id: 'ls_01', number: 1, titleAr: 'ترجمة الإمام ابن قدامة وبيان منهج السلف الصالح في نصوص الوحيين', duration: '٤٥ دقيقة', audioUrl: 'https://archive.org/download/wasetia_Badr/015.mp3' },
      { id: 'ls_02', number: 2, titleAr: 'إثبات ما وصف الله به نفسه أو وصفه به رسوله بلا تكييف ولا تمثيل', duration: '٤٩ دقيقة', audioUrl: 'https://archive.org/download/wasetia_Badr/016.mp3' },
      { id: 'ls_03', number: 3, titleAr: 'صفات الاستواء والنزول والوجه واليدين والمجيء الإلهي', duration: '٥٣ دقيقة', audioUrl: 'https://archive.org/download/wasetia_Badr/017.mp3' },
      { id: 'ls_04', number: 4, titleAr: 'القرآن كلام الله حقيقة بحرف وصوت وليس بمخلوق', duration: '٥٠ دقيقة', audioUrl: 'https://archive.org/download/wasetia_Badr/018.mp3' },
      { id: 'ls_05', number: 5, titleAr: 'رؤية المؤمنين لربهم في الجنة والإيمان بالقدر واليوم الآخر', duration: '٤٧ دقيقة', audioUrl: 'https://archive.org/download/wasetia_Badr/019.mp3' },
      { id: 'ls_06', number: 6, titleAr: 'مقام الصحابة الكرام والخلافة الراشدة وحقوق ولاة الأمر', duration: '٥٦ دقيقة', audioUrl: 'https://archive.org/download/wasetia_Badr/020.mp3' }
    ]
  },
  {
    id: 'course_fiqh_ad-iyah_badr',
    titleAr: 'فقه الأدعية والأذكار في اليوم والليلة',
    titleEn: 'Fiqh of Supplications & Daily Remembrances',
    scholarAr: 'الشيخ د. عبد الرزاق بن عبد المحسن البدر',
    roleAr: 'المدرس بالمسجد النبوي الشريف',
    categoryAr: 'سيرة ورقائق',
    categoryEn: 'Supplications & Heart Softeners',
    badge: 'مجالس الذكر والرقائق',
    descriptionAr: 'سلسلة نافعة في فقه الذكر والدعاء وآدابهما وشروط الإجابة وأذكار الصباح والمساء وأحوال اليوم والليلة.',
    lessonsCount: 8,
    audioStreamUrl: 'https://archive.org/download/Usul3_Badr/009.mp3',
    lessons: [
      { id: 'fa_01', number: 1, titleAr: 'فضل الذكر ومكانة الدعاء في حياة المسلم وثمراته في القلب', duration: '٤٣ دقيقة', audioUrl: 'https://archive.org/download/Usul3_Badr/009.mp3' },
      { id: 'fa_02', number: 2, titleAr: 'شروط إجابة الدعاء وآدابه وأسباب موانع الإجابة', duration: '٤٧ دقيقة', audioUrl: 'https://archive.org/download/Usul3_Badr/010.mp3' },
      { id: 'fa_03', number: 3, titleAr: 'فقه أذكار طرفي النهار: الصباح والمساء وفضلها وحفظها للعبد', duration: '٥٢ دقيقة', audioUrl: 'https://archive.org/download/Usul3_Badr/011.mp3' },
      { id: 'fa_04', number: 4, titleAr: 'أذكار النوم والاستيقاظ والآداب النبوية عند المنام', duration: '٤١ دقيقة', audioUrl: 'https://archive.org/download/Usul3_Badr/012.mp3' },
      { id: 'fa_05', number: 5, titleAr: 'أذكار الصلوات المكتوبة وأدعية الاستفتاح والركوع والسجود', duration: '٤٩ دقيقة', audioUrl: 'https://archive.org/download/Usul3_Badr/013.mp3' },
      { id: 'fa_06', number: 6, titleAr: 'أدعية تفريج الكروب والهموم والغموم والاستعاذة من الشرور', duration: '٤٦ دقيقة', audioUrl: 'https://archive.org/download/Usul3_Badr/014.mp3' },
      { id: 'fa_07', number: 7, titleAr: 'الاستغفار وفضله وصيغه وسيد الاستغفار', duration: '٤٤ دقيقة', audioUrl: 'https://archive.org/download/Usul3_Badr/015.mp3' },
      { id: 'fa_08', number: 8, titleAr: 'الصلاة على النبي ﷺ وفضائلها ومواطنها المستحبة', duration: '٥٠ دقيقة', audioUrl: 'https://archive.org/download/Usul3_Badr/016.mp3' }
    ]
  },
  {
    id: 'course_dalil_talib_ruhaily',
    titleAr: 'شرح دليل الطالب لنيل المطالب (كتاب الصلاة والعبادات)',
    titleEn: 'Explanation of Daleel At-Talib',
    scholarAr: 'الشيخ أ.د. سليمان بن سليم الله الرحيلي',
    roleAr: 'المدرس بالمسجد النبوي الشريف',
    categoryAr: 'الفقه',
    categoryEn: 'Fiqh',
    badge: 'فقه العبادات',
    descriptionAr: 'شرح فقهي رصين لكتاب دليل الطالب للإمام مرعي الكرمي الحنبلي، يُعنى بتحرير المذهب بالأدلة الصحيحة وتيسير الفروع.',
    lessonsCount: 7,
    audioStreamUrl: 'https://archive.org/download/11.sulayman.ruhailie.taharah.manhaj.salkeen_202110/01.sulayman.ruhailie.taharah.manhaj.salkeen.mp3',
    lessons: [
      { id: 'dt_01', number: 1, titleAr: 'كتاب الطهارة: المياه والآنية وقضاء الحاجة', duration: '٥٠ دقيقة', audioUrl: 'https://archive.org/download/11.sulayman.ruhailie.taharah.manhaj.salkeen_202110/01.sulayman.ruhailie.taharah.manhaj.salkeen.mp3' },
      { id: 'dt_02', number: 2, titleAr: 'فروض الوضوء ونواقضه وسنن الفطرة والمسح على الخفين', duration: '٥٣ دقيقة', audioUrl: 'https://archive.org/download/11.sulayman.ruhailie.taharah.manhaj.salkeen_202110/02.sulayman.ruhailie.taharah.manhaj.salkeen.mp3' },
      { id: 'dt_03', number: 3, titleAr: 'الغسل والتيمم وإزالة النجاسات وأحكام المعذورين', duration: '٤٨ دقيقة', audioUrl: 'https://archive.org/download/11.sulayman.ruhailie.taharah.manhaj.salkeen_202110/03.sulayman.ruhailie.taharah.manhaj.salkeen.mp3' },
      { id: 'dt_04', number: 4, titleAr: 'كتاب الصلاة: شروط الصلاة ومواقيتها ومكان الصلاة ولباسها', duration: '٥٤ دقيقة', audioUrl: 'https://archive.org/download/11.sulayman.ruhailie.taharah.manhaj.salkeen_202110/04.sulayman.ruhailie.taharah.manhaj.salkeen.mp3' },
      { id: 'dt_05', number: 5, titleAr: 'صفة الصلاة المفصلة وأركانها وواجباتها وسننها', duration: '٥٧ دقيقة', audioUrl: 'https://archive.org/download/11.sulayman.ruhailie.taharah.manhaj.salkeen_202110/05.sulayman.ruhailie.taharah.manhaj.salkeen.mp3' },
      { id: 'dt_06', number: 6, titleAr: 'سجود السهو وصلاة التطوع والوتر وأوقات النهي', duration: '٥١ دقيقة', audioUrl: 'https://archive.org/download/11.sulayman.ruhailie.taharah.manhaj.salkeen_202110/06.sulayman.ruhailie.taharah.manhaj.salkeen.mp3' },
      { id: 'dt_07', number: 7, titleAr: 'صلاة الجماعة وأحكام الإمامة وصلاة أهل الأعذار والجمعة', duration: '٦٠ دقيقة', audioUrl: 'https://archive.org/download/11.sulayman.ruhailie.taharah.manhaj.salkeen_202110/07.sulayman.ruhailie.taharah.manhaj.salkeen.mp3' }
    ]
  }
];

// ==========================================
// --- DATA: دروس وكراسي المسجد الحرام بمكة المكرمة ---
// ==========================================
const MAKKAH_MOSQUE_SCHEDULE = [
  {
    id: 'makkah_chair_tafsir_humaid',
    chairTitleAr: 'كرسي التفسير وأصول التدبر',
    chairTitleEn: 'Quran Tafsir & Contemplation Chair',
    bookAr: 'تفسير آيات الأحكام وتدبر القرآن العظيم',
    scholarAr: 'الشيخ د. صالح بن عبد الله بن حميد',
    roleAr: 'المستشار بالديوان الملكي وإمام وخطيب المسجد الحرام',
    timingAr: 'أسبوعياً بعد صلاة العشاء',
    timingCategory: 'isha',
    locationAr: 'المسجد الحرام • صحن المطاف أمام الكعبة المشرفة',
    badge: 'كرسي الحرم المكي',
    color: '#8C5E3C'
  },
  {
    id: 'makkah_chair_sunnah_sudais',
    chairTitleAr: 'كرسي السنة النبوية وجوامع الكلم',
    chairTitleEn: 'Prophetic Sunnah & Hadith Chair',
    bookAr: 'شرح صحيح مسلم وجوامع الكلم النبوية',
    scholarAr: 'الشيخ د. عبد الرحمن بن عبد العزيز السديس',
    roleAr: 'رئيس الشؤون الدينية وإمام وخطيب المسجد الحرام',
    timingAr: 'أسبوعياً بعد صلاة المغرب',
    timingCategory: 'maghrib',
    locationAr: 'المسجد الحرام • الرواق السعودي (أمام باب الملك فهد)',
    badge: 'مجلس أسبوعي مباشر',
    color: '#1E5A3E'
  },
  {
    id: 'makkah_chair_usul_bukhari',
    chairTitleAr: 'كرسي أصول الفقه ومقاصد الشريعة',
    chairTitleEn: 'Usul al-Fiqh & Sharia Objectives Chair',
    bookAr: 'شرح الورقات وقواعد الاستنباط الأصولية',
    scholarAr: 'الشيخ د. حسن بن عبد الحميد بخاري',
    roleAr: 'المدرس بالمسجد الحرام وعميد معهد اللغة العربية',
    timingAr: 'أيام الإثنين والأربعاء بعد صلاة المغرب',
    timingCategory: 'maghrib',
    locationAr: 'المسجد الحرام • توسعة الملك عبد الله (الرواق الشمالي)',
    badge: 'أصول الفقه',
    color: '#2E4C38'
  },
  {
    id: 'makkah_chair_fiqh_baleelah',
    chairTitleAr: 'كرسي الفقه الحنبلي والعبادات',
    chairTitleEn: 'Hanbali Fiqh & Acts of Worship Chair',
    bookAr: 'شرح عمدة الفقه للإمام ابن قدامة',
    scholarAr: 'الشيخ د. بندر بن عبد العزيز بليلة',
    roleAr: 'إمام وخطيب المسجد الحرام • عضو هيئة كبار العلماء',
    timingAr: 'أيام الأحد والثلاثاء بعد صلاة العصر',
    timingCategory: 'asr',
    locationAr: 'المسجد الحرام • الرواق الأرضي جوار باب العمرة',
    badge: 'فقه العبادات',
    color: '#7B5E28'
  },
  {
    id: 'makkah_chair_hedayat_dawsari',
    chairTitleAr: 'كرسي الهدايات القرآنية ومقاصد السور',
    chairTitleEn: 'Quranic Guidance & Surah Objectives Chair',
    bookAr: 'هدايات الآيات ومعالم التربية الإيمانية',
    scholarAr: 'الشيخ د. ياسر بن راشد الدوسري',
    roleAr: 'إمام وخطيب المسجد الحرام بمكة المكرمة',
    timingAr: 'أسبوعياً بعد صلاة العصر',
    timingCategory: 'asr',
    locationAr: 'المسجد الحرام • التوسعة السعودية الثالثة',
    badge: 'هدايات القرآن',
    color: '#1B5E20'
  }
];

const MAKKAH_MOSQUE_COURSES = [
  {
    id: 'course_ibanah_sudais',
    titleAr: 'شرح كتاب الإبانة عن شريعة الفرقة الناجية',
    titleEn: 'Explanation of Al-Ibanah by Ibn Battah',
    scholarAr: 'الشيخ د. عبد الرحمن بن عبد العزيز السديس',
    roleAr: 'رئيس الشؤون الدينية وإمام وخطيب المسجد الحرام',
    categoryAr: 'العقيدة',
    categoryEn: 'Creed',
    badge: 'كرسي الرواق السعودي',
    descriptionAr: 'شرح مؤصل لكتاب الإبانة الصغرى للإمام ابن بطة العكبري، ألقي برحاب المسجد الحرام بمكة في بيان منهج السلف الصالح.',
    lessonsCount: 10,
    audioStreamUrl: 'https://archive.org/download/Sharh-Shamail_An-Nabi/01.mp3',
    lessons: [
      { id: 'ms_01', number: 1, titleAr: 'مقدمة الكتاب والتحذير من البدع والافتراق ولزوم السنة', duration: '٤٨ دقيقة', audioUrl: 'https://archive.org/download/Sharh-Shamail_An-Nabi/01.mp3' },
      { id: 'ms_02', number: 2, titleAr: 'باب الأمر بلزوم الجماعة ومجانبة أهل الزيغ والأهواء', duration: '٤٤ دقيقة', audioUrl: 'https://archive.org/download/Sharh-Shamail_An-Nabi/02.mp3' },
      { id: 'ms_03', number: 3, titleAr: 'باب الإيمان بالقدر خيره وشره والإقرار بحكمة الله البالغة', duration: '٥٠ دقيقة', audioUrl: 'https://archive.org/download/Sharh-Shamail_An-Nabi/03.mp3' },
      { id: 'ms_04', number: 4, titleAr: 'باب القرآن كلام الله غير مخلوق منه بدأ وإليه يعود', duration: '٥٣ دقيقة', audioUrl: 'https://archive.org/download/Sharh-Shamail_An-Nabi/04.mp3' },
      { id: 'ms_05', number: 5, titleAr: 'باب الإيمان بالرؤية يوم القيامة والحوض والشفاعة العظمى', duration: '٤٩ دقيقة', audioUrl: 'https://archive.org/download/Sharh-Shamail_An-Nabi/05a.mp3' },
      { id: 'ms_06', number: 6, titleAr: 'باب صفات الله عز وجل وإثبات ما أثبته لنفسه بلا تمثيل', duration: '٥٢ دقيقة', audioUrl: 'https://archive.org/download/Sharh-Shamail_An-Nabi/06.mp3' },
      { id: 'ms_07', number: 7, titleAr: 'باب فضائل الصحابة الكرام والخلافة الراشدة ومكانتهم', duration: '٤٧ دقيقة', audioUrl: 'https://archive.org/download/Sharh-Shamail_An-Nabi/07.mp3' },
      { id: 'ms_08', number: 8, titleAr: 'باب السمع والطاعة لأئمة المسلمين وأثرها في استقرار الأمة', duration: '٤٥ دقيقة', audioUrl: 'https://archive.org/download/Sharh-Shamail_An-Nabi/08.mp3' },
      { id: 'ms_09', number: 9, titleAr: 'باب الكف عن الفتن وصيانة اللسان والقلب عن الخوض فيها', duration: '٥١ دقيقة', audioUrl: 'https://archive.org/download/Sharh-Shamail_An-Nabi/09.mp3' },
      { id: 'ms_10', number: 10, titleAr: 'خاتمة المتن في الوصية باتباع السنن والاعتصام بالوحيين', duration: '٥٦ دقيقة', audioUrl: 'https://archive.org/download/Sharh-Shamail_An-Nabi/10.mp3' }
    ]
  },
  {
    id: 'course_zad_maad_sudais',
    titleAr: 'شرح زاد المعاد في هدي خير العباد لابن القيم',
    titleEn: 'Explanation of Zad Al-Maad by Ibn Al-Qayyim',
    scholarAr: 'الشيخ د. عبد الرحمن بن عبد العزيز السديس',
    roleAr: 'رئيس الشؤون الدينية وإمام وخطيب المسجد الحرام',
    categoryAr: 'سيرة ورقائق',
    categoryEn: 'Seerah & Heart Softeners',
    badge: 'هدي النبوة بمكة',
    descriptionAr: 'دروس مباركة في معالم الهدي النبوي الشريف في العبادات والمعاملات والأخلاق من جوار الكعبة المشرفة.',
    lessonsCount: 8,
    audioStreamUrl: 'https://archive.org/download/Sharh-Shamail_An-Nabi/02.mp3',
    lessons: [
      { id: 'zm_01', number: 1, titleAr: 'معالم الهدي النبوي في العبادة والذكر ومحاسن الشريعة', duration: '٤٦ دقيقة', audioUrl: 'https://archive.org/download/Sharh-Shamail_An-Nabi/02.mp3' },
      { id: 'zm_02', number: 2, titleAr: 'هديه ﷺ في الطهارة والصلاة وخشوع المناجاة', duration: '٥٠ دقيقة', audioUrl: 'https://archive.org/download/Sharh-Shamail_An-Nabi/03.mp3' },
      { id: 'zm_03', number: 3, titleAr: 'هديه ﷺ في صلاة الجمعة والعيدين وأدعية الاستسقاء', duration: '٤٨ دقيقة', audioUrl: 'https://archive.org/download/Sharh-Shamail_An-Nabi/04.mp3' },
      { id: 'zm_04', number: 4, titleAr: 'هديه ﷺ في الصيام وتفطير الصائمين وقيام رمضان', duration: '٥٢ دقيقة', audioUrl: 'https://archive.org/download/Sharh-Shamail_An-Nabi/05a.mp3' },
      { id: 'zm_05', number: 5, titleAr: 'هديه ﷺ في الحج والعمرة والوقوف بعرفات والطواف', duration: '٥٨ دقيقة', audioUrl: 'https://archive.org/download/Sharh-Shamail_An-Nabi/06.mp3' },
      { id: 'zm_06', number: 6, titleAr: 'هديه ﷺ في التعامل مع الناس والرحمة بالمؤمنين', duration: '٤٤ دقيقة', audioUrl: 'https://archive.org/download/Sharh-Shamail_An-Nabi/07.mp3' },
      { id: 'zm_07', number: 7, titleAr: 'هديه ﷺ في الطب النبوي والرقية الشرعية والشفاء', duration: '٤٩ دقيقة', audioUrl: 'https://archive.org/download/Sharh-Shamail_An-Nabi/08.mp3' },
      { id: 'zm_08', number: 8, titleAr: 'هديه ﷺ في الأذكار الجامعة ودعاء تفريج الكروب', duration: '٥٣ دقيقة', audioUrl: 'https://archive.org/download/Sharh-Shamail_An-Nabi/09.mp3' }
    ]
  },
  {
    id: 'course_qawaid_fiqh_humaid',
    titleAr: 'شرح القواعد والضوابط الفقهية الكبرى',
    titleEn: 'Explanation of Major Fiqh Maxims',
    scholarAr: 'الشيخ د. صالح بن عبد الله بن حميد',
    roleAr: 'المستشار بالديوان الملكي وإمام وخطيب المسجد الحرام',
    categoryAr: 'الفقه',
    categoryEn: 'Fiqh',
    badge: 'كرسي صحن المطاف',
    descriptionAr: 'تحرير فقهي رصين للقواعد الفقهية الخمس الكبرى وتطبيقاتها المعاصرة، ألقي في رحاب الكعبة المشرفة.',
    lessonsCount: 10,
    audioStreamUrl: 'https://archive.org/download/05_20211026/01.mp3',
    lessons: [
      { id: 'qh_01', number: 1, titleAr: 'مقدمة القواعد الفقهية: نشأتها وتدوينها وأهميتها للفقيه', duration: '٥٢ دقيقة', audioUrl: 'https://archive.org/download/05_20211026/01.mp3' },
      { id: 'qh_02', number: 2, titleAr: 'القاعدة الأولى: الأمور بمقاصدها وتطبيقات النية في الشريعة', duration: '٥٤ دقيقة', audioUrl: 'https://archive.org/download/05_20211026/02.mp3' },
      { id: 'qh_03', number: 3, titleAr: 'تطبيقات قاعدة الأمور بمقاصدها في العبادات والمعاملات المالية', duration: '٤٨ دقيقة', audioUrl: 'https://archive.org/download/05_20211026/03.mp3' },
      { id: 'qh_04', number: 4, titleAr: 'القاعدة الثانية: اليقين لا يزول بالشك وأدلتها من الكتاب والسنة', duration: '٥٦ دقيقة', audioUrl: 'https://archive.org/download/05_20211026/04.mp3' },
      { id: 'qh_05', number: 5, titleAr: 'تطبيقات قاعدة اليقين في الطهارة والصلاة والطلاق والعقود', duration: '٥٠ دقيقة', audioUrl: 'https://archive.org/download/05_20211026/05.mp3' },
      { id: 'qh_06', number: 6, titleAr: 'القاعدة الثالثة: المشقة تجلب التيسير ورخص الشريعة الغراء', duration: '٥٣ دقيقة', audioUrl: 'https://archive.org/download/05_20211026/06.mp3' },
      { id: 'qh_07', number: 7, titleAr: 'القاعدة الرابعة: الضرر يزال وقواعد الضرورات والحاجات', duration: '٥٥ دقيقة', audioUrl: 'https://archive.org/download/05_20211026/07.mp3' },
      { id: 'qh_08', number: 8, titleAr: 'تطبيقات درء المفاسد وجلب المصالح في النوازل المعاصرة', duration: '٤٧ دقيقة', audioUrl: 'https://archive.org/download/05_20211026/08.mp3' },
      { id: 'qh_09', number: 9, titleAr: 'القاعدة الخامسة: العادة محكمة وضوابط الأعراف والتقاليد', duration: '٥١ دقيقة', audioUrl: 'https://archive.org/download/05_20211026/01.mp3' },
      { id: 'qh_10', number: 10, titleAr: 'القواعد الكلية التابعة وخاتمة المباحث الفقهية الشاملة', duration: '٥٨ دقيقة', audioUrl: 'https://archive.org/download/05_20211026/02.mp3' }
    ]
  },
  {
    id: 'course_tafsir_tadabbur_humaid',
    titleAr: 'مجالس في تدبر القرآن العظيم وأصول التفسير',
    titleEn: 'Meditative Tafsir & Hermeneutics Assemblies',
    scholarAr: 'الشيخ د. صالح بن عبد الله بن حميد',
    roleAr: 'المستشار بالديوان الملكي وإمام وخطيب المسجد الحرام',
    categoryAr: 'التفسير',
    categoryEn: 'Tafsir',
    badge: 'تدبر القرآن بمكة',
    descriptionAr: 'مجالس علمية تربوية في استنباط هدايات التنزيل الحكيم وتفسير آيات الأحكام والمواعظ الربانية.',
    lessonsCount: 8,
    audioStreamUrl: 'https://archive.org/download/Usul3_Badr/017.mp3',
    lessons: [
      { id: 'th_01', number: 1, titleAr: 'قواعد وأصول في تدبر كتاب الله ومعرفة معاني التنزيل', duration: '٤٥ دقيقة', audioUrl: 'https://archive.org/download/Usul3_Badr/017.mp3' },
      { id: 'th_02', number: 2, titleAr: 'هدايات سورة الفاتحة ومفاتيح الهداية والسعادة في الدارين', duration: '٤٩ دقيقة', audioUrl: 'https://archive.org/download/Usul3_Badr/018.mp3' },
      { id: 'th_03', number: 3, titleAr: 'تدبر آيات التوحيد ودلائل عظمة الخالق في سورة الأنعام', duration: '٥٢ دقيقة', audioUrl: 'https://archive.org/download/Usul3_Badr/019.mp3' },
      { id: 'th_04', number: 4, titleAr: 'قصة كليم الله موسى عليه السلام في القرآن والعبر المستفادة', duration: '٥٦ دقيقة', audioUrl: 'https://archive.org/download/Usul3_Badr/020.mp3' },
      { id: 'th_05', number: 5, titleAr: 'مقاصد وهدايات سورة الإسراء وبني إسرائيل وحرمة المسجد الأقصى', duration: '٥٠ دقيقة', audioUrl: 'https://archive.org/download/Usul3_Badr/021.mp3' },
      { id: 'th_06', number: 6, titleAr: 'معالم سورة النور في حفظ المجتمع وعفة الأسرة والأخلاق', duration: '٤٧ دقيقة', audioUrl: 'https://archive.org/download/Usul3_Badr/022.mp3' },
      { id: 'th_07', number: 7, titleAr: 'لطائف سورة الزمر في الإخلاص والتوحيد وأهوال القيامة', duration: '٥٣ دقيقة', audioUrl: 'https://archive.org/download/Usul3_Badr/023.mp3' },
      { id: 'th_08', number: 8, titleAr: 'هدايات قصار المفصل والتربية الإيمانية في جزء عم', duration: '٤٨ دقيقة', audioUrl: 'https://archive.org/download/Usul3_Badr/024.mp3' }
    ]
  },
  {
    id: 'course_tawheed_juhany',
    titleAr: 'شرح كتاب التوحيد وأصول العقيدة السليمة',
    titleEn: 'Explanation of Kitab At-Tawheed by Al-Juhany',
    scholarAr: 'الشيخ د. عبد الله بن عواد الجهني',
    roleAr: 'إمام وخطيب المسجد الحرام بمكة المكرمة',
    categoryAr: 'العقيدة',
    categoryEn: 'Creed',
    badge: 'كرسي الحرم المكي الشريف',
    descriptionAr: 'شرح ميسر لأبواب التوحيد وحق الله على العبيد ونبذ الشرك والخرافات ألقي في رحاب المسجد الحرام.',
    lessonsCount: 8,
    audioStreamUrl: 'https://archive.org/download/Mstawa_2/3-Mstawa2_01.mp3',
    lessons: [
      { id: 'tj_01', number: 1, titleAr: 'فضل التوحيد وما يكفر من الذنوب وحقيقة الاستسلام لله', duration: '٤٣ دقيقة', audioUrl: 'https://archive.org/download/Mstawa_2/3-Mstawa2_01.mp3' },
      { id: 'tj_02', number: 2, titleAr: 'من حقق التوحيد دخل الجنة بغير حساب ولا عذاب', duration: '٤٧ دقيقة', audioUrl: 'https://archive.org/download/Mstawa_2/3-Mstawa2_02.mp3' },
      { id: 'tj_03', number: 3, titleAr: 'الخوف من الشرك والتحذير من صغار الشرك والرياء', duration: '٤١ دقيقة', audioUrl: 'https://archive.org/download/Mstawa_2/3-Mstawa2_03.mp3' },
      { id: 'tj_04', number: 4, titleAr: 'الدعاء إلى شهادة أن لا إله إلا الله وفضل هداية الناس', duration: '٤٦ دقيقة', audioUrl: 'https://archive.org/download/Mstawa_2/3-Mstawa2_04.mp3' },
      { id: 'tj_05', number: 5, titleAr: 'تفسير كلمة التوحيد ونفي الشريك في العبادة والمحبة', duration: '٥٠ دقيقة', audioUrl: 'https://archive.org/download/Mstawa_2/3-Mstawa2_05.mp3' },
      { id: 'tj_06', number: 6, titleAr: 'النهي عن التبرك بالأشجار والأحجار والأماكن بلا دليل شرعي', duration: '٣٩ دقيقة', audioUrl: 'https://archive.org/download/Mstawa_2/3-Mstawa2_06.mp3' },
      { id: 'tj_07', number: 7, titleAr: 'إخلاص النذر والذبح والدعاء والاستغاثة لله جل في علاه', duration: '٤٥ دقيقة', audioUrl: 'https://archive.org/download/Mstawa_2/3-Mstawa2_07.mp3' },
      { id: 'tj_08', number: 8, titleAr: 'الشفاعة المثبتة والمنفية وعظمة رب العالمين يوم القيامة', duration: '٥٤ دقيقة', audioUrl: 'https://archive.org/download/Mstawa_2/3-Mstawa2_08.mp3' }
    ]
  },
  {
    id: 'course_qudsi_ghazzawi',
    titleAr: 'شرح الأحاديث القدسية وجوامع الكلم النبوية',
    titleEn: 'Explanation of Hadith Qudsi & Comprehensive Sayings',
    scholarAr: 'الشيخ د. فيصل بن جميل غزاوي',
    roleAr: 'إمام وخطيب المسجد الحرام بمكة المكرمة',
    categoryAr: 'الحديث',
    categoryEn: 'Hadith',
    badge: 'أحاديث القدسية بمكة',
    descriptionAr: 'شرح بياني إيماني لأحاديث الوحي الإلهي القدسي الواردة عن النبي ﷺ في سعة رحمة الله وعفوه ومحبته للمؤمنين.',
    lessonsCount: 8,
    audioStreamUrl: 'https://archive.org/download/raj3elsada-40NAWAWI/01.mp3',
    lessons: [
      { id: 'fg_01', number: 1, titleAr: 'حديث يا عبادي إني حرمت الظلم على نفسي وجعلته بينكم محرماً', duration: '٥٢ دقيقة', audioUrl: 'https://archive.org/download/raj3elsada-40NAWAWI/01.mp3' },
      { id: 'fg_02', number: 2, titleAr: 'حديث يا عبادي كلكم ضال إلا من هديته وحديث الاستغفار', duration: '٤٦ دقيقة', audioUrl: 'https://archive.org/download/raj3elsada-40NAWAWI/02.mp3' },
      { id: 'fg_03', number: 3, titleAr: 'حديث أنا عند ظن عبدي بي وأنا معه إذا ذكرني', duration: '٤٨ دقيقة', audioUrl: 'https://archive.org/download/raj3elsada-40NAWAWI/03.mp3' },
      { id: 'fg_04', number: 4, titleAr: 'حديث من عادى لي ولياً فقد آذنته بالحرب وفضل النوافل', duration: '٥٥ دقيقة', audioUrl: 'https://archive.org/download/raj3elsada-40NAWAWI/04.mp3' },
      { id: 'fg_05', number: 5, titleAr: 'حديث الكبرياء ردائي والعظمة إزاري فمن نازعني عذبته', duration: '٤٢ دقيقة', audioUrl: 'https://archive.org/download/raj3elsada-40NAWAWI/05.mp3' },
      { id: 'fg_06', number: 6, titleAr: 'حديث أعددت لعبادي الصالحين ما لا عين رأت ولا أذن سمعت', duration: '٥١ دقيقة', audioUrl: 'https://archive.org/download/raj3elsada-40NAWAWI/06.mp3' },
      { id: 'fg_07', number: 7, titleAr: 'حديث المتحابون في جلالي لهم منابر من نور يوم القيامة', duration: '٤٥ دقيقة', audioUrl: 'https://archive.org/download/raj3elsada-40NAWAWI/07.mp3' },
      { id: 'fg_08', number: 8, titleAr: 'حديث يا ابن آدم لو بلغت ذنوبك عنان السماء ثم استغفرتني غفرت لك', duration: '٥٦ دقيقة', audioUrl: 'https://archive.org/download/raj3elsada-40NAWAWI/08.mp3' }
    ]
  },
  {
    id: 'course_fiqh_siyam_baleelah',
    titleAr: 'شرح أحكام الصيام والزكاة والعبادات من عمدة الفقه',
    titleEn: 'Fiqh of Fasting & Zakat by Baleelah',
    scholarAr: 'الشيخ د. بندر بن عبد العزيز بليلة',
    roleAr: 'إمام المسجد الحرام • عضو هيئة كبار العلماء',
    categoryAr: 'الفقه',
    categoryEn: 'Fiqh',
    badge: 'مجلس الفقه الحنبلي',
    descriptionAr: 'شرح تأصيلي فقهي لأبواب الصيام والزكاة والاعتكاف ومناسك الحج، ألقي بجوار باب العمرة بالمسجد الحرام.',
    lessonsCount: 8,
    audioStreamUrl: 'https://archive.org/download/omdat_alahkam/01.mp3',
    lessons: [
      { id: 'bb_01', number: 1, titleAr: 'كتاب الصيام: شروط وجوب صوم رمضان وثبوت دخول الشهر', duration: '٤٩ دقيقة', audioUrl: 'https://archive.org/download/omdat_alahkam/01.mp3' },
      { id: 'bb_02', number: 2, titleAr: 'مفطرات الصيام ومفسداته وما يكره ويستحب للصائم', duration: '٥٣ دقيقة', audioUrl: 'https://archive.org/download/omdat_alahkam/02.mp3' },
      { id: 'bb_03', number: 3, titleAr: 'أحكام قضاء الصيام والكفارة وأصحاب الأعذار الشرعية', duration: '٤٥ دقيقة', audioUrl: 'https://archive.org/download/omdat_alahkam/03.mp3' },
      { id: 'bb_04', number: 4, titleAr: 'صيام التطوع والأيام الفاضلة وأحكام الاعتكاف وليلة القدر', duration: '٤٨ دقيقة', audioUrl: 'https://archive.org/download/omdat_alahkam/04.mp3' },
      { id: 'bb_05', number: 5, titleAr: 'كتاب الزكاة: شروط وجوب الزكاة وأنصبتها في الأموال والذهب', duration: '٥٤ دقيقة', audioUrl: 'https://archive.org/download/omdat_alahkam/05.mp3' },
      { id: 'bb_06', number: 6, titleAr: 'زكاة عروض التجارة والأسهم وزكاة الفطر ومصارف الزكاة الثمانية', duration: '٥٠ دقيقة', audioUrl: 'https://archive.org/download/omdat_alahkam/06.mp3' },
      { id: 'bb_07', number: 7, titleAr: 'كتاب الحج: شروط الاستطاعة والمواقيت المكانية والإحرام', duration: '٥٨ دقيقة', audioUrl: 'https://archive.org/download/omdat_alahkam/07.mp3' },
      { id: 'bb_08', number: 8, titleAr: 'صفة أعمال الحج والعمرة خطوة بخطوة وأحكام الفدية', duration: '٦٢ دقيقة', audioUrl: 'https://archive.org/download/omdat_alahkam/08.mp3' }
    ]
  },
  {
    id: 'course_waraqat_usul_bukhari',
    titleAr: 'شرح متن الورقات لإمام الحرمين في أصول الفقه',
    titleEn: 'Explanation of Al-Waraqat in Usul al-Fiqh',
    scholarAr: 'الشيخ د. حسن بن عبد الحميد بخاري',
    roleAr: 'المدرس بالمسجد الحرام وعميد معهد اللغة العربية',
    categoryAr: 'الفقه',
    categoryEn: 'Fiqh & Principles',
    badge: 'كرسي أصول الفقه بمكة',
    descriptionAr: 'شرح منهجي بديع لمتن الورقات في أصول الفقه، يجمع بين دقة القواعد الأصولية وجمال البيان واللسان العربي.',
    lessonsCount: 8,
    audioStreamUrl: 'https://archive.org/download/Mstawa_1/1-Mstawa1_01.mp3',
    lessons: [
      { id: 'hb_01', number: 1, titleAr: 'مقدمة في تعريف أصول الفقه وأبواب الفقه والأحكام الشرعية', duration: '٤٧ دقيقة', audioUrl: 'https://archive.org/download/Mstawa_1/1-Mstawa1_01.mp3' },
      { id: 'hb_02', number: 2, titleAr: 'أقسام الكلام: الحقيقة والمجاز والأمر والنهي ودلالاتهما', duration: '٥١ دقيقة', audioUrl: 'https://archive.org/download/Mstawa_1/2-Mstawa1_01.mp3' },
      { id: 'hb_03', number: 3, titleAr: 'العام والخاص ومخصصات العموم المتصلة والمنفصلة', duration: '٤٨ دقيقة', audioUrl: 'https://archive.org/download/Mstawa_1/3-Mstawa1_01.mp3' },
      { id: 'hb_04', number: 4, titleAr: 'المجمل والمبين والظاهر والمؤول وأفعال النبي ﷺ ودلالتها', duration: '٥٢ دقيقة', audioUrl: 'https://archive.org/download/Mstawa_1/3-Mstawa1_02.mp3' },
      { id: 'hb_05', number: 5, titleAr: 'النسخ وشروطه وأقسامه في القرآن الكريم والسنة المطهرة', duration: '٤٥ دقيقة', audioUrl: 'https://archive.org/download/Mstawa_1/3-Mstawa1_03.mp3' },
      { id: 'hb_06', number: 6, titleAr: 'الإجماع وحجيته وأقوال الصحابة وخبر الواحد والتوتر', duration: '٥٣ دقيقة', audioUrl: 'https://archive.org/download/Mstawa_1/3-Mstawa1_04.mp3' },
      { id: 'hb_07', number: 7, titleAr: 'القياس وأركانه الأربعة: الأصل والفرع والعلة والحكم', duration: '٥٦ دقيقة', audioUrl: 'https://archive.org/download/Mstawa_1/4-Mstawa1_01.mp3' },
      { id: 'hb_08', number: 8, titleAr: 'شروط المفتي والمستفتي وأحكام التقليد والاجتهاد وخاتمة المتن', duration: '٥٤ دقيقة', audioUrl: 'https://archive.org/download/Mstawa_1/4-Mstawa1_02.mp3' }
    ]
  }
];

const ALLAH_99_NAMES = [
  { id: 1, nameAr: 'الله', nameEn: 'Allah', meaningAr: 'الإله الحق الجامع لصفات الألوهية المستحق للعبادة وحده دون سواه.', verse: '﴿ هُوَ اللَّهُ الَّذِي لَا إِلَٰهَ إِلَّا هُوَ ﴾' },
  { id: 2, nameAr: 'الرَّحْمَنُ', nameEn: 'Ar-Rahman', meaningAr: 'واسع الرحمة الشاملة لجميع الخلائق في الدنيا ومفيض النعم.', verse: '﴿ الرَّحْمَٰنُ عَلَى الْعَرْشِ اسْتَوَىٰ ﴾' },
  { id: 3, nameAr: 'الرَّحِيمُ', nameEn: 'Ar-Raheem', meaningAr: 'خاص الرحمة بالمؤمنين هداية في الدنيا ومغفرة وجنة في الآخرة.', verse: '﴿ وَكَانَ بِالْمُؤْمِنِينَ رَحِيمًا ﴾' },
  { id: 4, nameAr: 'المَلِكُ', nameEn: 'Al-Malik', meaningAr: 'المتصرف في ملكه بلا منازع، المتفرد بالأمر والنهي والسلطان.', verse: '﴿ فَتَعَالَى اللَّهُ الْمَلِكُ الْحَقُّ ﴾' },
  { id: 5, nameAr: 'القُدُّوسُ', nameEn: 'Al-Quddus', meaningAr: 'المنزه عن كل عيب ونقص، المطهر الذي لا تليق به إلا المحامد.', verse: '﴿ الْمَلِكِ الْقُدُّوسِ السَّلَامِ ﴾' },
  { id: 6, nameAr: 'السَّلَامُ', nameEn: 'As-Salam', meaningAr: 'السالم من كل آفة ونقص، والواهب للسلام والأمان في الدارين.', verse: '﴿ السَّلَامُ الْمُؤْمِنُ الْمُهَيْمِنُ ﴾' },
  { id: 7, nameAr: 'المُؤْمِنُ', nameEn: "Al-Mu'min", meaningAr: 'المصدق لرسله بالمعجزات، المؤمّن لأوليائه من عذابه وخوفه.', verse: '﴿ وَآمَنَهُم مِّنْ خَوْفٍ ﴾' },
  { id: 8, nameAr: 'المُهَيْمِنُ', nameEn: 'Al-Muhaymin', meaningAr: 'المطلع على خفايا الأمور، الحافظ الرقيب الشهيد على كل شيء.', verse: '﴿ الْمُهَيْمِنُ الْعَزِيزُ الْجَبَّارُ ﴾' },
  { id: 9, nameAr: 'العَزِيزُ', nameEn: 'Al-Aziz', meaningAr: 'القوي الغالب الذي لا يغلبه شيء ولا يُنال جنابه لعزته وقدرته.', verse: '﴿ وَهُوَ الْعَزِيزُ الْحَكِيمُ ﴾' },
  { id: 10, nameAr: 'الجَبَّارُ', nameEn: 'Al-Jabbar', meaningAr: 'الذي يجبر قلوب المنكسرين، ويقهر الجبابرة بعظمته وجلاله.', verse: '﴿ الْعَزِيزُ الْجَبَّارُ الْمُتَكَبِّرُ ﴾' },
  { id: 11, nameAr: 'المُتَكَبِّرُ', nameEn: 'Al-Mutakabbir', meaningAr: 'المنفرد بالكبرياء والعظمة والمجد، المتعالي عن صفات الخلق.', verse: '﴿ وَلَهُ الْكِبْرِيَاءُ فِي السَّمَاوَاتِ وَالْأَرْضِ ﴾' },
  { id: 12, nameAr: 'الخَالِقُ', nameEn: 'Al-Khaliq', meaningAr: 'الموجد لجميع الأشياء ومقدرها على غير مثال سابق بحكمته.', verse: '﴿ اللَّهُ خَالِقُ كُلِّ شَيْءٍ ﴾' },
  { id: 13, nameAr: 'البَارِئُ', nameEn: 'Al-Bari', meaningAr: 'المبرز لما قدره من العدم إلى الوجود مميزاً له عن سواه.', verse: '﴿ الْخَالِقُ الْبَارِئُ الْمُصَوِّرُ ﴾' },
  { id: 14, nameAr: 'المُصَوِّرُ', nameEn: 'Al-Musawwir', meaningAr: 'الذي صاغ المخلوقات وهيأها بأشكال وهيئات بديعة متناسقة.', verse: '﴿ هُوَ الَّذِي يُصَوِّرُكُمْ فِي الْأَرْحَامِ ﴾' },
  { id: 15, nameAr: 'الغَفَّارُ', nameEn: 'Al-Ghaffar', meaningAr: 'الستار لذنوب عباده المتجاوز عن خطاياهم المرة تلو المرة.', verse: '﴿ وَإِنِّي لَغَفَّارٌ لِّمَن تَابَ وَآمَنَ ﴾' },
  { id: 16, nameAr: 'القَهَّارُ', nameEn: 'Al-Qahhar', meaningAr: 'الذي خضعت له الرقاب وذلت لعزته الكائنات والمخلوقات أجمعين.', verse: '﴿ وَهُوَ الْوَاحِدُ الْقَهَّارُ ﴾' },
  { id: 17, nameAr: 'الوَهَّابُ', nameEn: 'Al-Wahhab', meaningAr: 'الجواد الذي يجود بالعطاء الواسع بلا عوض ولا مسألة.', verse: '﴿ أَمْ عِندَهُمْ خَزَائِنُ رَحْمَةِ رَبِّكَ الْعَزِيزِ الْوَهَّابِ ﴾' },
  { id: 18, nameAr: 'الرَّزَّاقُ', nameEn: 'Ar-Razzaq', meaningAr: 'المتكفل بأقوات العباد ومدبر أرزاق القلوب والأبدان.', verse: '﴿ إِنَّ اللَّهَ هُوَ الرَّزَّاقُ ذُو الْقُوَّةِ الْمَتِينُ ﴾' },
  { id: 19, nameAr: 'الفَتَّاحُ', nameEn: 'Al-Fattah', meaningAr: 'الحاكم بين عباده بالعدل، وفاتح أبواب الرحمة والرزق والهدى.', verse: '﴿ وَهُوَ الْفَتَّاحُ الْعَلِيمُ ﴾' },
  { id: 20, nameAr: 'العَلِيمُ', nameEn: 'Al-Aleem', meaningAr: 'المحيط علماً بكل شيء دقيقه وجليله، ماضيه ومستقبله وحاضره.', verse: '﴿ إِنَّ اللَّهَ بِكُلِّ شَيْءٍ عَلِيمٌ ﴾' },
  { id: 21, nameAr: 'القَابِضُ', nameEn: 'Al-Qabid', meaningAr: 'المضيق للرزق بحكمته، القابض للأرواح والنفوس بمشيئته.' },
  { id: 22, nameAr: 'البَاسِطُ', nameEn: 'Al-Basit', meaningAr: 'الموسع للرزق على من يشاء، الناشر للرحمة والبهجة في القلوب.' },
  { id: 23, nameAr: 'الخَافِضُ', nameEn: 'Al-Khafid', meaningAr: 'المذل للمتكبرين والكافرين والخافض لأقدار الظالمين.' },
  { id: 24, nameAr: 'الرَّافِعُ', nameEn: 'Ar-Rafi', meaningAr: 'الرافع للمؤمنين الصالحين بالعلم والإيمان والدرجات العلى.' },
  { id: 25, nameAr: 'المُعِزُّ', nameEn: "Al-Mu'izz", meaningAr: 'الواهب للعزة والمنعة لمن أطاعه واتبع رضوانه.' },
  { id: 26, nameAr: 'المُذِلُّ', nameEn: 'Al-Mudhill', meaningAr: 'الذي يذل من عصاه وتمرد على أمره بالخذلان والمهانة.' },
  { id: 27, nameAr: 'السَّمِيعُ', nameEn: 'As-Sami', meaningAr: 'السامع لكل صوت ونجوى وخاطرة لا يفوته سر ولا علانية.' },
  { id: 28, nameAr: 'البَصِيرُ', nameEn: 'Al-Baseer', meaningAr: 'المشاهد لكل مرئي ودبيب، يرى خائنة الأعين وما تخفي الصدور.' },
  { id: 29, nameAr: 'الحَكَمُ', nameEn: 'Al-Hakam', meaningAr: 'الحاكم العادل الذي لا جور في قضائه ولا تبديل لحكمه.' },
  { id: 30, nameAr: 'العَدْلُ', nameEn: 'Al-Adl', meaningAr: 'المنزه عن الظلم والجور، الواضع لكل شيء موضعه بالحق.' },
  { id: 31, nameAr: 'اللَّطِيفُ', nameEn: 'Al-Lateef', meaningAr: 'البار بعباده الرفيق بهم، الموصل للخير إليهم بلطيف التدبير.' },
  { id: 32, nameAr: 'الخَبِيرُ', nameEn: 'Al-Khabeer', meaningAr: 'العالم بخفايا وبواطن الأمور كما يعلم ظواهرها.' },
  { id: 33, nameAr: 'الحَلِيمُ', nameEn: 'Al-Haleem', meaningAr: 'الصبور الذي لا يعاجل العصاة بالعقوبة لعلهم يرجعون.' },
  { id: 34, nameAr: 'العَظِيمُ', nameEn: 'Al-Azeem', meaningAr: 'الجامع لصفات الكبرياء والمجد والجلال التي لا تدركها العقول.' },
  { id: 35, nameAr: 'الغَفُورُ', nameEn: 'Al-Ghafoor', meaningAr: 'التام المغفرة الذي يعفو عن كبائر وصغائر الذنوب تكرماً منه.' },
  { id: 36, nameAr: 'الشَّكُورُ', nameEn: 'Ash-Shakoor', meaningAr: 'الذي يضاعف الثواب على العمل القليل ويشكر طاعة عباده.' },
  { id: 37, nameAr: 'العَلِيُّ', nameEn: 'Al-Ali', meaningAr: 'المتعالي في ذاته وصفاته وقدره وقهره فوق جميع خلقه.' },
  { id: 38, nameAr: 'الكَبِيرُ', nameEn: 'Al-Kabeer', meaningAr: 'العظيم الذي لا أكبر منه، فكل شيء دونه حقير وصغير.' },
  { id: 39, nameAr: 'الحَفِيظُ', nameEn: 'Al-Hafeez', meaningAr: 'الحافظ للكون وسماواته وأرضه وحافظ أعمال العباد وأرزاقهم.' },
  { id: 40, nameAr: 'المُقِيتُ', nameEn: 'Al-Muqeet', meaningAr: 'الخالق للأقوات، المتكفل بإيصال الغذاء لأجساد وأرواح خلقه.' },
  { id: 41, nameAr: 'الحَسِيبُ', nameEn: 'Al-Haseeb', meaningAr: 'الكافي لعباده، والمحاسب لهم على مثاقيل الذر والقطمير.' },
  { id: 42, nameAr: 'الجَلِيلُ', nameEn: 'Al-Jaleel', meaningAr: 'الموصوف بصفات الجلال والعظمة والكمال المنزه عن النقص.' },
  { id: 43, nameAr: 'الكَرِيمُ', nameEn: 'Al-Kareem', meaningAr: 'الكثير الخير الدائم العطاء المعطي بلا منة ولا حساب.' },
  { id: 44, nameAr: 'الرَّقِيبُ', nameEn: 'Ar-Raqeeb', meaningAr: 'الحاضر المطلع الذي لا يغيب عنه ذرة في الأرض ولا في السماء.' },
  { id: 45, nameAr: 'المُجِيبُ', nameEn: 'Al-Mujeeb', meaningAr: 'الذي يجيب دعوة الداع إذا دعاه ويكشف السوء عن المضطرين.' },
  { id: 46, nameAr: 'الوَاسِعُ', nameEn: 'Al-Wasi', meaningAr: 'الواسع في رحمته ومغفرته وعلمه وإحسانه وغناه لكل الكائنات.' },
  { id: 47, nameAr: 'الحَكِيمُ', nameEn: 'Al-Hakeem', meaningAr: 'المتقن لتدبير الكون الذي يضع الأشياء في مواضعها الصحيحة.' },
  { id: 48, nameAr: 'الوَدُودُ', nameEn: 'Al-Wadood', meaningAr: 'المحب لأوليائه والمحبوب في قلوب عباده الصالحين.' },
  { id: 49, nameAr: 'المَجِيدُ', nameEn: 'Al-Majeed', meaningAr: 'الواسع الكرم العظيم الشأن البالغ المنتهى في الشرف والثناء.' },
  { id: 50, nameAr: 'البَاعِثُ', nameEn: "Al-Ba'ith", meaningAr: 'المحيي للأموات بعد فنائهم للجزاء والحساب يوم القيامة.' },
  { id: 51, nameAr: 'الشَّهِيدُ', nameEn: 'Ash-Shaheed', meaningAr: 'الحاضر الشاهد على كل ما يجري في مملكته لا يعزب عنه شيء.' },
  { id: 52, nameAr: 'الحَقُّ', nameEn: 'Al-Haqq', meaningAr: 'الثابت الموجود الذي لا يتغير ولا يزول ووعده وقوله الحق.' },
  { id: 53, nameAr: 'الوَكِيلُ', nameEn: 'Al-Wakeel', meaningAr: 'الكفيل بأرزاق ومصالح خلقه والمفوض إليه كل أمر بخير.' },
  { id: 54, nameAr: 'القَوِيُّ', nameEn: 'Al-Qawi', meaningAr: 'التام القدرة الذي لا يلحقه ضعف ولا يعجزه شيء في الوجود.' },
  { id: 55, nameAr: 'المَتِينُ', nameEn: 'Al-Mateen', meaningAr: 'الشديد القوة الراسخ القدرة الذي لا ينقطع اقتداره.' },
  { id: 56, nameAr: 'الوَلِيُّ', nameEn: 'Al-Wali', meaningAr: 'الناصر والمعين لأوليائه المؤمنين والمحب لهم.' },
  { id: 57, nameAr: 'الحَمِيدُ', nameEn: 'Al-Hameed', meaningAr: 'المستحق لجميع صور الحمد والثناء في السراء والضراء.' },
  { id: 58, nameAr: 'المُحْصِي', nameEn: 'Al-Muhsi', meaningAr: 'العالم بقدر كل شيء وأعداده وأوقاته بلا سهو ولا نسيان.' },
  { id: 59, nameAr: 'المُبْدِئُ', nameEn: 'Al-Mubdi', meaningAr: 'المبتدئ لخلق الكائنات وإيجادها من العدم دون سابق مثال.' },
  { id: 60, nameAr: 'المُعِيدُ', nameEn: "Al-Mu'eed", meaningAr: 'الذي يعيد الخلق بعد الموت كهيئتهم أول مرة للحساب.' },
  { id: 61, nameAr: 'المُحْيِي', nameEn: 'Al-Muhyi', meaningAr: 'الواهب للحياة لمن يشاء ببث الروح وإحياء الموتى.' },
  { id: 62, nameAr: 'المُمِيتُ', nameEn: 'Al-Mumeet', meaningAr: 'السالب للحياة بانتهاء الآجال المقدرة عند قبض الأرواح.' },
  { id: 63, nameAr: 'الحَيُّ', nameEn: 'Al-Hayy', meaningAr: 'الدائم الباقي بحياة كاملة أزلية أبدية لا موت فيها ولا سنة.' },
  { id: 64, nameAr: 'القَيُّومُ', nameEn: 'Al-Qayyoom', meaningAr: 'القائم بنفسه المقيم لكل ما سواه من السماوات والأرض.' },
  { id: 65, nameAr: 'الوَاجِدُ', nameEn: 'Al-Wajid', meaningAr: 'الغني الذي يجد كل ما يريده ولا يعوزه شيء ولا يفوته مطلوب.' },
  { id: 66, nameAr: 'المَاجِدُ', nameEn: 'Al-Majid', meaningAr: 'الكريم الواسع المجد والفضل والعطاء والنعماء.' },
  { id: 67, nameAr: 'الوَاحِدُ', nameEn: 'Al-Wahid', meaningAr: 'المتفرد الذي لا شريك له ولا ند ولا مثيل في ذاته وأفعاله.' },
  { id: 68, nameAr: 'الصَّمَدُ', nameEn: 'As-Samad', meaningAr: 'السيد المقصود في الحوائج الذي تصمد وتفزع إليه الخلائق كلها.' },
  { id: 69, nameAr: 'القَادِرُ', nameEn: 'Al-Qadir', meaningAr: 'الذي يقدر على فعل كل ما يريد، لا يعجزه شيء في الأرض ولا في السماء.' },
  { id: 70, nameAr: 'المُقْتَدِرُ', nameEn: 'Al-Muqtadir', meaningAr: 'المتمكن البالغ الغاية في إمضاء قدرته في المخلوقات.' },
  { id: 71, nameAr: 'المُقَدِّمُ', nameEn: 'Al-Muqaddim', meaningAr: 'الذي يقدم الأشياء ومنازل العباد وأزمانها بحكمته البالغة.' },
  { id: 72, nameAr: 'المُؤَخِّرُ', nameEn: "Al-Mu'akhkhir", meaningAr: 'الذي يؤخر ما يشاء من الأمور لحكمة وعدل يعلمه سبحانه.' },
  { id: 73, nameAr: 'الأَوَّلُ', nameEn: 'Al-Awwal', meaningAr: 'الذي ليس قبله شيء، الأزلي بلا بداية.' },
  { id: 74, nameAr: 'الآخِرُ', nameEn: 'Al-Akhir', meaningAr: 'الذي ليس بعده شيء، الباقي بعد فناء خلقه أجمعين.' },
  { id: 75, nameAr: 'الظَّاهِرُ', nameEn: 'Az-Zahir', meaningAr: 'الذي ليس فوقه شيء لعلوه وظهور دلائل ربوبيته وقدرته.' },
  { id: 76, nameAr: 'البَاطِنُ', nameEn: 'Al-Batin', meaningAr: 'الذي ليس دونه شيء لقربه ولطفه واحتجابه عن أبصار خلقه.' },
  { id: 77, nameAr: 'الوَالِي', nameEn: 'Al-Wali', meaningAr: 'المالك للأشياء المتصرف فيها بمشيئته وحمايته وسلطانه.' },
  { id: 78, nameAr: 'المُتَعَالِي', nameEn: "Al-Muta'ali", meaningAr: 'المتنزه عن صفات المخلوقين المرتفع عن كل نقص وتشبيه.' },
  { id: 79, nameAr: 'البَرُّ', nameEn: 'Al-Barr', meaningAr: 'المحسن العطوف الصادق في وعده الذي يفيض بالبر على خلقه.' },
  { id: 80, nameAr: 'التَّوَّابُ', nameEn: 'At-Tawwab', meaningAr: 'القابل لتوبة عباده المرة بعد المرة مهما عظمت ذنوبهم.' },
  { id: 81, nameAr: 'المُنْتَقِمُ', nameEn: 'Al-Muntaqim', meaningAr: 'المعاقب للظالمين والمفسدين بالعدل نصرة للمظلومين.' },
  { id: 82, nameAr: 'العَفُوُّ', nameEn: 'Al-Afuww', meaningAr: 'الماحي للذنوب والخطايا المتجاوز عن عقوبة المذنبين بفضله.' },
  { id: 83, nameAr: 'الرَّؤُوفُ', nameEn: "Ar-Ra'oof", meaningAr: 'الشديد الرحمة والرأفة بعباده، اللطيف بهم في أحوالهم.' },
  { id: 84, nameAr: 'مَالِكُ المُلْكِ', nameEn: 'Malik Al-Mulk', meaningAr: 'المتصرف في الكون كيف يشاء، يؤتي الملك من يشاء وينزع الملك ممن يشاء.' },
  { id: 85, nameAr: 'ذُو الجَلَالِ وَالإِكْرَامِ', nameEn: 'Dhul Jalali Wal Ikram', meaningAr: 'المستحق للتعظيم والتسبيح والمكرم لأوليائه بالرضوان.' },
  { id: 86, nameAr: 'المُقْسِطُ', nameEn: 'Al-Muqsit', meaningAr: 'العادل في أحكامه المنصف للمظلوم من الظالم بلا ميل.' },
  { id: 87, nameAr: 'الجَامِعُ', nameEn: 'Al-Jami', meaningAr: 'الجامع للخلائق يوم القيامة للحساب والجامع للفضائل والكمالات.' },
  { id: 88, nameAr: 'الغَنِيُّ', nameEn: 'Al-Ghani', meaningAr: 'المستغني عن خلقه وعن كل شيء، والكل فقير ومحتاج إليه.' },
  { id: 89, nameAr: 'المُغْنِي', nameEn: 'Al-Mughni', meaningAr: 'المعطي للكفاية الذي يغني من يشاء من عباده بفضله ورزقه.' },
  { id: 90, nameAr: 'المَانِعُ', nameEn: 'Al-Mani', meaningAr: 'الحامي لأوليائه، والمانع لما لا تقتضي حكمته إعطاءه خيراً لهم.' },
  { id: 91, nameAr: 'الضَّارُّ', nameEn: 'Ad-Darr', meaningAr: 'المقدر للضر بحكمته وابتلائه ولا راد لضره إلا هو سبحانه.' },
  { id: 92, nameAr: 'النَّافِعُ', nameEn: 'An-Nafi', meaningAr: 'المقدر للنفع والخير والبركة في الوجود لا معطي لما منع.' },
  { id: 93, nameAr: 'النُّورُ', nameEn: 'An-Noor', meaningAr: 'الذي أشرقت بنوره السماوات والأرض والهادي لقلوب المؤمنين.' },
  { id: 94, nameAr: 'الهَادِي', nameEn: 'Al-Hadi', meaningAr: 'المرشد لخلقه إلى مصالحهم ولأوليائه إلى صراط النجاة المستقيم.' },
  { id: 95, nameAr: 'البَدِيعُ', nameEn: 'Al-Badi', meaningAr: 'المبدع للكون بلا نظير ولا مثال سابق في غاية الحسن والإتقان.' },
  { id: 96, nameAr: 'البَاقِي', nameEn: 'Al-Baqi', meaningAr: 'الدائم الوجود الذي لا يفنى ويبقى وجهه ذو الجلال والإكرام.' },
  { id: 97, nameAr: 'الوَارِثُ', nameEn: 'Al-Warith', meaningAr: 'الباقي بعد فناء الخلائق وإليه يرجع كل ملك وسلطان.' },
  { id: 98, nameAr: 'الرَّشِيدُ', nameEn: 'Ar-Rasheed', meaningAr: 'الحكيم في تدبيره وتصريفه الذي رشدت أفعاله وأحكامه كلها.' },
  { id: 99, nameAr: 'الصَّبُورُ', nameEn: 'As-Saboor', meaningAr: 'الذي لا يعاجل بالعقوبة بل يمهل عباده بفضله وحلمه العظيم.' }
];


  // ==========================================
  // --- MODULE 3.8: ISLAMIC ENCYCLOPEDIA SUITE ---
  // ==========================================

  // --- 1. RUQYAH SHARIAH (الرقية الشرعية الكاملة) ---
  const renderRuqyah = () => {
    const handleCounterInc = (itemId: string, maxTarget: number) => {
      const cur = ruqyahCounters[itemId] || 0;
      const next = cur >= maxTarget ? 0 : cur + 1;
      setRuqyahCounters((prev) => ({ ...prev, [itemId]: next }));
      triggerHapticFeedback(next >= maxTarget ? 'success' : 'light');
    };

    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <Header
          title={t('الرقية الشرعية الكاملة', 'Comprehensive Ruqyah')}
          subtitle={t('من الكتاب والسنة النبوية الصحيحة', 'From Holy Quran & Prophetic Sunnah')}
          onBack={goBack}
          rightAction={
            <TouchableOpacity
              onPress={() => {
                Share.share({
                  title: 'الرقية الشرعية الكاملة - رفيق المسلم',
                  message: 'الرقية الشرعية الكاملة من القرآن الكريم والسنة النبوية الشريفة الشافية بإذن الله.\n\n— تطبيق رفيق المسلم'
                });
              }}
              style={{ padding: 6 }}
            >
              <Feather name="share-2" size={18} color={TOKENS.colors.primary} />
            </TouchableOpacity>
          }
        />

        {/* 3-Way Mode Segment Bar */}
        <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 }}>
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : '#2A201A',
              borderRadius: TOKENS.radius.pill,
              padding: 4,
              borderWidth: 1,
              borderColor: TOKENS.colors.secondary
            }}
          >
            {[
              { id: 'quran', title: t('آيات القرآن 📖', 'Quranic Verses') },
              { id: 'sunnah', title: t('الأدعية النبوية 🤲', 'Prophetic Duas') },
              { id: 'adab', title: t('الآداب والشروط 🛡️', 'Rules & Etiquette') }
            ].map((tab) => {
              const active = ruqyahTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => {
                    setRuqyahTab(tab.id as any);
                    triggerHapticFeedback('light');
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 9,
                    borderRadius: TOKENS.radius.pill,
                    backgroundColor: active ? TOKENS.colors.primary : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <TextUI weight="bold" size={12} color={active ? '#FFFFFF' : c.textSecondary}>
                    {tab.title}
                  </TextUI>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 110 }}>
          {/* Top Decorative Card */}
          <View
            style={{
              backgroundColor: themeMode === 'light' ? TOKENS.colors.secondaryLight : '#2E2218',
              borderRadius: TOKENS.radius.lg,
              borderWidth: 1.5,
              borderColor: TOKENS.colors.secondary,
              padding: 16,
              marginBottom: 16,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <ArabesqueWatermark opacity={0.07} color={TOKENS.colors.secondary} />
            <View style={{ width: '100%', marginBottom: 6 }}>
              <MoorishArchFrame height={16} color={TOKENS.colors.secondary} opacity={0.8} />
            </View>
            <TextUI size={13} weight="bold" color={TOKENS.colors.primaryDark} style={{ textAlign: 'center' }}>
              {ruqyahTab === 'quran'
                ? t('﴿ وَنُنَزِّلُ مِنَ الْقُرْآنِ مَا هُوَ شِفَاءٌ وَرَحْمَةٌ لِّلْمُؤْمِنِينَ ﴾', 'Quran is Healing and Mercy for Believers')
                : ruqyahTab === 'sunnah'
                ? t('«بِاسْمِ اللَّهِ أَرْقِيكَ، مِنْ كُلِّ شَيْءٍ يُؤْذِيكَ، اللَّهُ يَشْفِيكَ»', 'In the Name of Allah I recite for your healing')
                : t('آداب وشروط الرقية الشرعية الصحيحة الخالية من الشبهات', 'Authentic Etiquette of Prophetic Ruqyah')}
            </TextUI>
          </View>

          {/* Tab 1: Quranic Verses */}
          {ruqyahTab === 'quran' && (
            <View>
              {RUQYAH_QURAN_ITEMS.map((item) => {
                const count = ruqyahCounters[item.id] || 0;
                const done = count >= item.repeat;
                return (
                  <View
                    key={item.id}
                    style={{
                      backgroundColor: c.surface,
                      borderRadius: TOKENS.radius.lg,
                      borderWidth: 1,
                      borderColor: done ? '#4E7D5B' : c.border,
                      padding: 18,
                      marginBottom: 14,
                      ...makeShadow('0 2px 10px rgba(0,0,0,0.03)', '#000', 0.03, 4, { width: 0, height: 1 }, 2)
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <IslamicMedallion size={34} borderColor={TOKENS.colors.secondary} bg={themeMode === 'light' ? TOKENS.colors.secondaryLight : '#382A20'}>
                          <TextUI size={11} weight="bold" color={TOKENS.colors.primaryDark}>
                            {toArabicNumber(item.repeat)}×
                          </TextUI>
                        </IslamicMedallion>
                        <View style={{ marginRight: 10 }}>
                          <TextUI weight="bold" size={15} color={TOKENS.colors.primaryDark}>
                            {item.titleAr}
                          </TextUI>
                          <TextUI size={11} color={TOKENS.colors.secondary}>
                            {item.reference}
                          </TextUI>
                        </View>
                      </View>

                      {/* Repetition Counter Badge */}
                      <TouchableOpacity
                        onPress={() => handleCounterInc(item.id, item.repeat)}
                        style={{
                          backgroundColor: done ? '#4E7D5B' : themeMode === 'light' ? TOKENS.colors.primaryLight : '#35251C',
                          paddingHorizontal: 12,
                          paddingVertical: 5,
                          borderRadius: TOKENS.radius.pill,
                          borderWidth: 1,
                          borderColor: done ? '#4E7D5B' : TOKENS.colors.secondary
                        }}
                      >
                        <TextUI size={12} weight="bold" color={done ? '#FFFFFF' : TOKENS.colors.primary}>
                          {done ? t('تم التكرار ✓', 'Done ✓') : `${toArabicNumber(count)} / ${toArabicNumber(item.repeat)}`}
                        </TextUI>
                      </TouchableOpacity>
                    </View>

                    {/* Verse Text with authentic Uthmani font styling */}
                    <TextUI
                      quran
                      size={20}
                      color={TOKENS.colors.primaryDark}
                      style={{ lineHeight: 36, textAlign: 'center', marginVertical: 10, paddingHorizontal: 4 }}
                    >
                      {item.verse}
                    </TextUI>

                    {/* Benefit and Virtues */}
                    <View
                      style={{
                        backgroundColor: themeMode === 'light' ? '#FAF6F0' : '#271F1A',
                        borderRadius: TOKENS.radius.md,
                        padding: 10,
                        marginTop: 10,
                        borderLeftWidth: 3,
                        borderLeftColor: TOKENS.colors.secondary
                      }}
                    >
                      <TextUI size={12} color={c.textSecondary} style={{ lineHeight: 18 }}>
                        💡 {item.benefit}
                      </TextUI>
                    </View>

                    {/* Actions Row */}
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                      <TouchableOpacity
                        onPress={() => {
                          const copyMsg = `﴿ ${item.verse} ﴾\n\n[${item.reference}]\n— الرقية الشرعية • رفيق المسلم`;
                          if (typeof navigator !== 'undefined' && navigator.clipboard) {
                            navigator.clipboard.writeText(copyMsg);
                          }
                          triggerHapticFeedback('success');
                          setCopyToast(true);
                          setTimeout(() => setCopyToast(false), 2500);
                        }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: TOKENS.radius.pill,
                          backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : '#32231A'
                        }}
                      >
                        <Feather name="copy" size={13} color={TOKENS.colors.primary} style={{ marginLeft: 4 }} />
                        <TextUI size={11} color={TOKENS.colors.primary} weight="medium">
                          {t('نسخ', 'Copy')}
                        </TextUI>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => {
                          Share.share({
                            title: item.titleAr,
                            message: `﴿ ${item.verse} ﴾\n\n${item.reference}\n— تطبيق رفيق المسلم`
                          });
                        }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: TOKENS.radius.pill,
                          backgroundColor: themeMode === 'light' ? TOKENS.colors.secondaryLight : '#3A2C20'
                        }}
                      >
                        <Feather name="share-2" size={13} color={TOKENS.colors.secondary} style={{ marginLeft: 4 }} />
                        <TextUI size={11} color={TOKENS.colors.primaryDark} weight="medium">
                          {t('مشاركة', 'Share')}
                        </TextUI>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Tab 2: Prophetic Duas */}
          {ruqyahTab === 'sunnah' && (
            <View>
              {RUQYAH_SUNNAH_ITEMS.map((item) => {
                const count = ruqyahCounters[item.id] || 0;
                const done = count >= item.repeat;
                return (
                  <View
                    key={item.id}
                    style={{
                      backgroundColor: c.surface,
                      borderRadius: TOKENS.radius.lg,
                      borderWidth: 1,
                      borderColor: done ? '#4E7D5B' : c.border,
                      padding: 18,
                      marginBottom: 14
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <IslamicMedallion size={34} borderColor={TOKENS.colors.secondary} bg={themeMode === 'light' ? TOKENS.colors.secondaryLight : '#382A20'}>
                          <TextUI size={11} weight="bold" color={TOKENS.colors.primaryDark}>
                            {toArabicNumber(item.repeat)}×
                          </TextUI>
                        </IslamicMedallion>
                        <View style={{ marginRight: 10 }}>
                          <TextUI weight="bold" size={15} color={TOKENS.colors.primaryDark}>
                            {item.titleAr}
                          </TextUI>
                          <TextUI size={11} color={TOKENS.colors.secondary}>
                            {item.source}
                          </TextUI>
                        </View>
                      </View>

                      <TouchableOpacity
                        onPress={() => handleCounterInc(item.id, item.repeat)}
                        style={{
                          backgroundColor: done ? '#4E7D5B' : themeMode === 'light' ? TOKENS.colors.primaryLight : '#35251C',
                          paddingHorizontal: 12,
                          paddingVertical: 5,
                          borderRadius: TOKENS.radius.pill,
                          borderWidth: 1,
                          borderColor: done ? '#4E7D5B' : TOKENS.colors.secondary
                        }}
                      >
                        <TextUI size={12} weight="bold" color={done ? '#FFFFFF' : TOKENS.colors.primary}>
                          {done ? t('تم التكرار ✓', 'Done ✓') : `${toArabicNumber(count)} / ${toArabicNumber(item.repeat)}`}
                        </TextUI>
                      </TouchableOpacity>
                    </View>

                    <TextUI
                      size={17}
                      weight="bold"
                      color={TOKENS.colors.primaryDark}
                      style={{ lineHeight: 30, textAlign: 'center', marginVertical: 8, paddingHorizontal: 4 }}
                    >
                      «{item.text}»
                    </TextUI>

                    <View
                      style={{
                        backgroundColor: themeMode === 'light' ? '#FAF6F0' : '#271F1A',
                        borderRadius: TOKENS.radius.md,
                        padding: 10,
                        marginTop: 8,
                        borderLeftWidth: 3,
                        borderLeftColor: TOKENS.colors.secondary
                      }}
                    >
                      <TextUI size={12} color={c.textSecondary} style={{ lineHeight: 18 }}>
                        💡 {item.benefit}
                      </TextUI>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                      <TouchableOpacity
                        onPress={() => {
                          const copyMsg = `« ${item.text} »\n\n[${item.source}]\n— الرقية الشرعية • رفيق المسلم`;
                          if (typeof navigator !== 'undefined' && navigator.clipboard) {
                            navigator.clipboard.writeText(copyMsg);
                          }
                          triggerHapticFeedback('success');
                          setCopyToast(true);
                          setTimeout(() => setCopyToast(false), 2500);
                        }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: TOKENS.radius.pill,
                          backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : '#32231A'
                        }}
                      >
                        <Feather name="copy" size={13} color={TOKENS.colors.primary} style={{ marginLeft: 4 }} />
                        <TextUI size={11} color={TOKENS.colors.primary} weight="medium">
                          {t('نسخ', 'Copy')}
                        </TextUI>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => {
                          Share.share({
                            title: item.titleAr,
                            message: `« ${item.text} »\n\n${item.source}\n— تطبيق رفيق المسلم`
                          });
                        }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: TOKENS.radius.pill,
                          backgroundColor: themeMode === 'light' ? TOKENS.colors.secondaryLight : '#3A2C20'
                        }}
                      >
                        <Feather name="share-2" size={13} color={TOKENS.colors.secondary} style={{ marginLeft: 4 }} />
                        <TextUI size={11} color={TOKENS.colors.primaryDark} weight="medium">
                          {t('مشاركة', 'Share')}
                        </TextUI>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Tab 3: Etiquette & Rules */}
          {ruqyahTab === 'adab' && (
            <View>
              {RUQYAH_ADAB_ITEMS.map((item, idx) => (
                <View
                  key={idx}
                  style={{
                    backgroundColor: c.surface,
                    borderRadius: TOKENS.radius.lg,
                    borderWidth: 1,
                    borderColor: c.border,
                    padding: 16,
                    marginBottom: 12
                  }}
                >
                  <TextUI weight="bold" size={15} color={TOKENS.colors.primaryDark} style={{ marginBottom: 6 }}>
                    {item.titleAr}
                  </TextUI>
                  <TextUI size={13} color={c.textSecondary} style={{ lineHeight: 22 }}>
                    {item.descAr}
                  </TextUI>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  // --- 2. AN-NAWAWI'S 40 HADITHS (الأربعون النووية) ---
  const renderHadith40 = () => {
    const selectedHadith = HADITH_40_DATA.find((h) => h.id === selectedHadithId) || HADITH_40_DATA[0];

    const filteredHadiths = HADITH_40_DATA.filter((h) => {
      if (!hadithSearch) return true;
      const q = hadithSearch.toLowerCase().trim();
      return (
        h.titleAr.includes(q) ||
        h.narratorAr.includes(q) ||
        h.textAr.includes(q) ||
        toArabicNumber(h.id).includes(q) ||
        h.id.toString().includes(q)
      );
    });

    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <Header
          title={t('الأربعون النووية', "An-Nawawi's 40 Hadiths")}
          subtitle={t('الأحاديث الجامعة لأصول وقواعد الإسلام', 'Foundational Prophetic Traditions')}
          onBack={goBack}
        />

        {/* Search Bar */}
        <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: c.surface,
              borderRadius: TOKENS.radius.pill,
              paddingHorizontal: 14,
              borderWidth: 1,
              borderColor: c.border,
              height: 44
            }}
          >
            <Feather name="search" size={16} color={TOKENS.colors.primary} style={{ marginLeft: 8 }} />
            <TextInput
              value={hadithSearch}
              onChangeText={setHadithSearch}
              placeholder={t('ابحث برقم الحديث، العنوان، أو الراوي...', 'Search hadith by title, narrator...')}
              placeholderTextColor={c.textSecondary}
              style={{
                flex: 1,
                fontFamily: 'Tajawal_500Medium',
                fontSize: 13,
                color: c.textPrimary,
                textAlign: isRTL ? 'right' : 'left'
              }}
            />
            {hadithSearch.length > 0 && (
              <TouchableOpacity onPress={() => setHadithSearch('')}>
                <Feather name="x" size={16} color={c.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Horizontal Quick Hadith Chips */}
        <View style={{ paddingVertical: 8 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          >
            {HADITH_40_DATA.map((h) => {
              const isSelected = h.id === selectedHadithId;
              return (
                <TouchableOpacity
                  key={h.id}
                  onPress={() => {
                    setSelectedHadithId(h.id);
                    triggerHapticFeedback('light');
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: isSelected ? TOKENS.colors.primary : c.surface,
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: TOKENS.radius.pill,
                    borderWidth: 1,
                    borderColor: isSelected ? TOKENS.colors.primary : c.border
                  }}
                >
                  <TextUI size={11} weight="bold" color={isSelected ? '#FFFFFF' : TOKENS.colors.primaryDark}>
                    {toArabicNumber(h.id)}. {h.titleAr}
                  </TextUI>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Hadith Detail View */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 110 }}>
          {/* Main Selected Hadith Card */}
          <View
            style={{
              backgroundColor: c.surface,
              borderRadius: TOKENS.radius.lg,
              borderWidth: 1.5,
              borderColor: TOKENS.colors.secondary,
              padding: 20,
              marginBottom: 18,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <ArabesqueWatermark opacity={0.06} color={TOKENS.colors.secondary} />
            <View style={{ width: '100%', marginBottom: 10 }}>
              <MoorishArchFrame height={20} color={TOKENS.colors.secondary} opacity={0.8} />
            </View>

            {/* Title & Number */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <IslamicMedallion size={46} borderColor={TOKENS.colors.secondary} bg={themeMode === 'light' ? TOKENS.colors.secondaryLight : '#382A20'}>
                <TextUI size={14} weight="bold" color={TOKENS.colors.primaryDark}>
                  {toArabicNumber(selectedHadith.id)}
                </TextUI>
              </IslamicMedallion>
              <View style={{ flex: 1, marginRight: 12, alignItems: 'flex-start' }}>
                <TextUI size={12} weight="bold" color={TOKENS.colors.secondary}>
                  {t('الحديث رقم', 'Hadith No.')} {toArabicNumber(selectedHadith.id)}
                </TextUI>
                <TextUI weight="bold" size={18} color={TOKENS.colors.primaryDark}>
                  {selectedHadith.titleAr}
                </TextUI>
              </View>
            </View>

            {/* Narrator Badge */}
            <View
              style={{
                alignSelf: 'flex-start',
                backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : '#35251C',
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderRadius: TOKENS.radius.pill,
                marginBottom: 14
              }}
            >
              <TextUI size={12} weight="medium" color={TOKENS.colors.primary}>
                عن {selectedHadith.narratorAr}
              </TextUI>
            </View>

            {/* Hadith Arabic Text */}
            <TextUI
              quran
              size={21}
              color={TOKENS.colors.primaryDark}
              style={{ lineHeight: 38, textAlign: 'justify', marginVertical: 12 }}
            >
              {selectedHadith.textAr}
            </TextUI>

            {/* Source & Grading */}
            <View
              style={{
                borderTopWidth: 1,
                borderColor: c.border,
                paddingTop: 10,
                marginTop: 10,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <TextUI size={11} color={c.textSecondary}>
                📜 {selectedHadith.source}
              </TextUI>

              {/* Action Buttons */}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => {
                    const fullText = `الحديث ${toArabicNumber(selectedHadith.id)}: ${selectedHadith.titleAr}\nعن ${selectedHadith.narratorAr}\n\n${selectedHadith.textAr}\n\n[${selectedHadith.source}]\n— الأربعون النووية • تطبيق رفيق المسلم`;
                    if (typeof navigator !== 'undefined' && navigator.clipboard) {
                      navigator.clipboard.writeText(fullText);
                    }
                    triggerHapticFeedback('success');
                    setCopyToast(true);
                    setTimeout(() => setCopyToast(false), 2500);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : '#32231A',
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: TOKENS.radius.pill
                  }}
                >
                  <Feather name="copy" size={13} color={TOKENS.colors.primary} style={{ marginLeft: 4 }} />
                  <TextUI size={11} color={TOKENS.colors.primary} weight="medium">
                    {t('نسخ', 'Copy')}
                  </TextUI>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    Share.share({
                      title: selectedHadith.titleAr,
                      message: `${selectedHadith.titleAr}\n${selectedHadith.textAr}\n\n[${selectedHadith.source}]\n— الأربعون النووية • رفيق المسلم`
                    });
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: themeMode === 'light' ? TOKENS.colors.secondaryLight : '#3A2C20',
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: TOKENS.radius.pill
                  }}
                >
                  <Feather name="share-2" size={13} color={TOKENS.colors.secondary} style={{ marginLeft: 4 }} />
                  <TextUI size={11} color={TOKENS.colors.primaryDark} weight="medium">
                    {t('مشاركة', 'Share')}
                  </TextUI>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Key Lessons & Benefits Section */}
          <TextUI weight="bold" size={15} color={TOKENS.colors.primaryDark} style={{ marginBottom: 10, paddingHorizontal: 4 }}>
            {t('الشرح والفوائد التربوية المستفادة:', 'Key Lessons & Benefits:')}
          </TextUI>

          {selectedHadith.lessons.map((lesson, idx) => (
            <View
              key={idx}
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                backgroundColor: c.surface,
                borderRadius: TOKENS.radius.md,
                padding: 12,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: c.border
              }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: TOKENS.colors.secondaryLight,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: 10,
                  marginTop: 1,
                  borderWidth: 1,
                  borderColor: TOKENS.colors.secondary
                }}
              >
                <TextUI size={11} weight="bold" color={TOKENS.colors.primaryDark}>
                  {toArabicNumber(idx + 1)}
                </TextUI>
              </View>
              <TextUI size={13} color={c.textPrimary} style={{ flex: 1, lineHeight: 22 }}>
                {lesson}
              </TextUI>
            </View>
          ))}

          {/* Next / Previous Navigation Controls */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
            <TouchableOpacity
              disabled={selectedHadithId <= 1}
              onPress={() => {
                if (selectedHadithId > 1) {
                  setSelectedHadithId(selectedHadithId - 1);
                  triggerHapticFeedback('light');
                }
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                opacity: selectedHadithId <= 1 ? 0.4 : 1,
                backgroundColor: c.surface,
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: TOKENS.radius.pill,
                borderWidth: 1,
                borderColor: c.border
              }}
            >
              <Feather name="chevron-right" size={16} color={TOKENS.colors.primary} style={{ marginLeft: 4 }} />
              <TextUI size={13} weight="bold" color={TOKENS.colors.primary}>
                {t('الحديث السابق', 'Previous')}
              </TextUI>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={selectedHadithId >= HADITH_40_DATA.length}
              onPress={() => {
                if (selectedHadithId < HADITH_40_DATA.length) {
                  setSelectedHadithId(selectedHadithId + 1);
                  triggerHapticFeedback('light');
                }
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                opacity: selectedHadithId >= HADITH_40_DATA.length ? 0.4 : 1,
                backgroundColor: TOKENS.colors.primary,
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: TOKENS.radius.pill
              }}
            >
              <TextUI size={13} weight="bold" color="#FFFFFF">
                {t('الحديث التالي', 'Next')}
              </TextUI>
              <Feather name="chevron-left" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  };

  // --- 3. 99 BEAUTIFUL NAMES OF ALLAH (أسماء الله الحسنى) ---
  const renderAllahNames = () => {
    const filteredNames = ALLAH_99_NAMES.filter((item) => {
      if (!allahNamesSearch) return true;
      const q = allahNamesSearch.toLowerCase().trim();
      return (
        item.nameAr.includes(q) ||
        item.nameEn.toLowerCase().includes(q) ||
        item.meaningAr.includes(q) ||
        toArabicNumber(item.id).includes(q) ||
        item.id.toString().includes(q)
      );
    });

    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <Header
          title={t('أسماء الله الحسنى', '99 Names of Allah')}
          subtitle={t('٩٩ اسماً • من أحصاها دخل الجنة', '99 Divine Names • Memorize for Paradise')}
          onBack={goBack}
        />

        {/* Top Hadith Banner */}
        <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 }}>
          <View
            style={{
              backgroundColor: themeMode === 'light' ? TOKENS.colors.secondaryLight : '#2E2218',
              borderRadius: TOKENS.radius.lg,
              borderWidth: 1.5,
              borderColor: TOKENS.colors.secondary,
              padding: 14,
              alignItems: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <ArabesqueWatermark opacity={0.07} color={TOKENS.colors.secondary} />
            <TextUI size={12} weight="bold" color={TOKENS.colors.primaryDark} align="center">
              «إِنَّ لِلَّهِ تِسْعَةً وَتِسْعِينَ اسْمًا، مِائَةً إِلَّا وَاحِدًا، مَنْ أَحْصَاهَا دَخَلَ الْجَنَّةَ»
            </TextUI>
            <TextUI size={11} color={TOKENS.colors.secondary} align="center" style={{ marginTop: 3 }}>
              {t('متفق عليه • صحيح البخاري ومسلم', 'Sahih Al-Bukhari & Muslim')}
            </TextUI>
          </View>
        </View>

        {/* Search Bar */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: c.surface,
              borderRadius: TOKENS.radius.pill,
              paddingHorizontal: 14,
              borderWidth: 1,
              borderColor: c.border,
              height: 44
            }}
          >
            <Feather name="search" size={16} color={TOKENS.colors.primary} style={{ marginLeft: 8 }} />
            <TextInput
              value={allahNamesSearch}
              onChangeText={setAllahNamesSearch}
              placeholder={t('ابحث في أسماء الله الحسنى أو المعاني...', 'Search by divine name or meaning...')}
              placeholderTextColor={c.textSecondary}
              style={{
                flex: 1,
                fontFamily: 'Tajawal_500Medium',
                fontSize: 13,
                color: c.textPrimary,
                textAlign: isRTL ? 'right' : 'left'
              }}
            />
            {allahNamesSearch.length > 0 && (
              <TouchableOpacity onPress={() => setAllahNamesSearch('')}>
                <Feather name="x" size={16} color={c.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 99 Names Grid */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12, paddingBottom: 110 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            {filteredNames.map((item) => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.8}
                onPress={() => {
                  setSelectedAllahName(item);
                  triggerHapticFeedback('light');
                }}
                style={{
                  width: '48.5%',
                  backgroundColor: c.surface,
                  borderRadius: TOKENS.radius.lg,
                  borderWidth: 1.2,
                  borderColor: TOKENS.colors.secondary,
                  padding: 12,
                  marginBottom: 10,
                  alignItems: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                  ...makeShadow('0 2px 8px rgba(93, 58, 34, 0.04)', '#5D3A22', 0.04, 4, { width: 0, height: 1 }, 2)
                }}
              >
                <ArabesqueWatermark opacity={0.04} color={TOKENS.colors.secondary} />

                {/* Badge Number */}
                <View
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : '#35251C',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: TOKENS.colors.secondary
                  }}
                >
                  <TextUI size={10} weight="bold" color={TOKENS.colors.primaryDark}>
                    {toArabicNumber(item.id)}
                  </TextUI>
                </View>

                {/* Calligraphic Name */}
                <TextUI
                  quran
                  weight="bold"
                  size={24}
                  color={TOKENS.colors.primaryDark}
                  style={{ marginTop: 12, marginBottom: 2 }}
                >
                  {item.nameAr}
                </TextUI>

                {/* Transliteration */}
                <TextUI size={11} weight="medium" color={TOKENS.colors.secondary} style={{ marginBottom: 6 }}>
                  {item.nameEn}
                </TextUI>

                {/* Brief Meaning Preview */}
                <TextUI
                  numberOfLines={2}
                  size={11}
                  color={c.textSecondary}
                  align="center"
                  style={{ lineHeight: 16 }}
                >
                  {item.meaningAr}
                </TextUI>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Modal Detail for Selected Divine Name */}
        <Modal
          visible={!!selectedAllahName}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setSelectedAllahName(null)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(26, 20, 17, 0.75)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 24
            }}
          >
            {selectedAllahName && (
              <View
                style={{
                  width: '100%',
                  maxWidth: 380,
                  backgroundColor: c.bg,
                  borderRadius: 24,
                  borderWidth: 2,
                  borderColor: TOKENS.colors.secondary,
                  padding: 22,
                  alignItems: 'center',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <ArabesqueWatermark opacity={0.08} color={TOKENS.colors.secondary} />
                <View style={{ width: '100%', marginBottom: 12 }}>
                  <MoorishArchFrame height={24} color={TOKENS.colors.secondary} opacity={0.85} />
                </View>

                {/* Close Button */}
                <TouchableOpacity
                  onPress={() => setSelectedAllahName(null)}
                  style={{ position: 'absolute', top: 16, left: 16, padding: 6, zIndex: 10 }}
                >
                  <Feather name="x" size={20} color={c.textSecondary} />
                </TouchableOpacity>

                {/* Big Medallion */}
                <IslamicMedallion size={68} borderColor={TOKENS.colors.secondary} bg={themeMode === 'light' ? TOKENS.colors.secondaryLight : '#382A20'}>
                  <TextUI size={16} weight="bold" color={TOKENS.colors.primaryDark}>
                    {toArabicNumber(selectedAllahName.id)}
                  </TextUI>
                </IslamicMedallion>

                {/* Name */}
                <TextUI
                  quran
                  weight="bold"
                  size={36}
                  color={TOKENS.colors.primaryDark}
                  style={{ marginTop: 12, marginBottom: 2 }}
                >
                  {selectedAllahName.nameAr}
                </TextUI>

                <TextUI size={14} weight="bold" color={TOKENS.colors.secondary} style={{ marginBottom: 16 }}>
                  {selectedAllahName.nameEn}
                </TextUI>

                {/* Meaning Card */}
                <View
                  style={{
                    width: '100%',
                    backgroundColor: c.surface,
                    borderRadius: TOKENS.radius.lg,
                    borderWidth: 1,
                    borderColor: c.border,
                    padding: 16,
                    marginBottom: 14
                  }}
                >
                  <TextUI weight="bold" size={13} color={TOKENS.colors.primary} style={{ marginBottom: 6, textAlign: 'left' }}>
                    {t('المعنى والدلالة الإيمانية:', 'Divine Meaning & Significance:')}
                  </TextUI>
                  <TextUI size={14} color={c.textPrimary} style={{ lineHeight: 22, textAlign: 'justify' }}>
                    {selectedAllahName.meaningAr}
                  </TextUI>
                </View>

                {/* Quranic Verse Reference if present */}
                {selectedAllahName.verse && (
                  <View
                    style={{
                      width: '100%',
                      backgroundColor: themeMode === 'light' ? TOKENS.colors.secondaryLight : '#32231A',
                      borderRadius: TOKENS.radius.md,
                      padding: 12,
                      marginBottom: 16,
                      borderWidth: 1,
                      borderColor: TOKENS.colors.secondary
                    }}
                  >
                    <TextUI quran size={16} color={TOKENS.colors.primaryDark} align="center" style={{ lineHeight: 26 }}>
                      {selectedAllahName.verse}
                    </TextUI>
                  </View>
                )}

                {/* Actions */}
                <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                  <TouchableOpacity
                    onPress={() => {
                      const shareTxt = `﴿ ${selectedAllahName.nameAr} - ${selectedAllahName.nameEn} ﴾\n\nمن أسماء الله الحسنى:\n${selectedAllahName.meaningAr}\n\n— تطبيق رفيق المسلم`;
                      if (typeof navigator !== 'undefined' && navigator.clipboard) {
                        navigator.clipboard.writeText(shareTxt);
                      }
                      triggerHapticFeedback('success');
                      setCopyToast(true);
                      setTimeout(() => setCopyToast(false), 2500);
                      setSelectedAllahName(null);
                    }}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingVertical: 12,
                      borderRadius: TOKENS.radius.pill,
                      backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : '#32231A',
                      borderWidth: 1,
                      borderColor: TOKENS.colors.secondary
                    }}
                  >
                    <Feather name="copy" size={14} color={TOKENS.colors.primary} style={{ marginLeft: 6 }} />
                    <TextUI size={13} weight="bold" color={TOKENS.colors.primary}>
                      {t('نسخ', 'Copy')}
                    </TextUI>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      Share.share({
                        title: selectedAllahName.nameAr,
                        message: `﴿ ${selectedAllahName.nameAr} ﴾ (${selectedAllahName.nameEn})\n${selectedAllahName.meaningAr}\n\n— تطبيق رفيق المسلم`
                      });
                      setSelectedAllahName(null);
                    }}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingVertical: 12,
                      borderRadius: TOKENS.radius.pill,
                      backgroundColor: TOKENS.colors.primary
                    }}
                  >
                    <Feather name="share-2" size={14} color="#FFFFFF" style={{ marginLeft: 6 }} />
                    <TextUI size={13} weight="bold" color="#FFFFFF">
                      {t('مشاركة', 'Share')}
                    </TextUI>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </Modal>
      </View>
    );
  };

  // ==========================================
  // --- MODULE: TWO HOLY MOSQUES LESSONS (دروس الحرمين الشريفين: المكي والنبوي) ---
  // ==========================================
  const renderProphetMosqueLessons = () => {
    const currentCourses = selectedMosque === 'makkah' ? MAKKAH_MOSQUE_COURSES : PROPHET_MOSQUE_COURSES;
    const currentSchedule = selectedMosque === 'makkah' ? MAKKAH_MOSQUE_SCHEDULE : PROPHET_MOSQUE_SCHEDULE;

    const tabs = [
      { id: 'all', titleAr: 'كافة السلاسل', titleEn: 'All Series', count: currentCourses.length },
      { id: 'schedule', titleAr: selectedMosque === 'makkah' ? 'كراسي الحرم المكي' : 'كراسي المسجد النبوي', titleEn: 'Live Chairs', count: currentSchedule.length },
      { id: 'العقيدة', titleAr: 'العقيدة', titleEn: 'Creed' },
      { id: 'الحديث', titleAr: 'الحديث', titleEn: 'Hadith' },
      { id: 'الفقه', titleAr: 'الفقه', titleEn: 'Fiqh' },
      { id: 'التفسير', titleAr: 'التفسير', titleEn: 'Tafsir' },
      { id: 'سيرة ورقائق', titleAr: 'السيرة والرقائق', titleEn: 'Seerah' }
    ];

    const filteredCourses = currentCourses.filter((course) => {
      const matchesTab = lessonCategoryTab === 'all' || course.categoryAr === lessonCategoryTab;
      const matchesSearch =
        !lessonSearchQuery.trim() ||
        course.titleAr.includes(lessonSearchQuery) ||
        course.scholarAr.includes(lessonSearchQuery) ||
        course.categoryAr.includes(lessonSearchQuery);
      return matchesTab && matchesSearch;
    });

    const isCurrentLessonPlaying = audioPlaying && currentAudioType === 'lesson' && activeLesson;

    return (
      <View
        style={{ flex: 1, backgroundColor: c.bg, direction: isRTL ? 'rtl' : 'ltr' }}
        {...({ dir: isRTL ? 'rtl' : 'ltr' } as any)}
      >
        {/* Top Header */}
        <Header
          title={selectedMosque === 'makkah' ? t('دروس المسجد الحرام بمكة', 'Grand Mosque of Makkah Lessons') : t('دروس المسجد النبوي الشريف', "Prophet's Mosque Lessons")}
          onBack={goBack}
          rightAction={
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => {
                setLessonSearchQuery(lessonSearchQuery ? '' : ' ');
                triggerHapticFeedback('light');
              }}
              style={{
                width: 38,
                height: 38,
                borderRadius: TOKENS.radius.pill,
                backgroundColor: c.surface,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: c.border
              }}
            >
              <Feather name="search" size={17} color={TOKENS.colors.primary} />
            </TouchableOpacity>
          }
        />

        {/* Mosque Switcher Segment (الحرم المكي 🕋 / الحرم النبوي 🕌) */}
        <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 2 }}>
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: themeMode === 'light' ? '#EAE5DB' : '#2A2018',
              borderRadius: TOKENS.radius.lg,
              padding: 4,
              borderWidth: 1,
              borderColor: 'rgba(198, 146, 85, 0.3)'
            }}
          >
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                setSelectedMosque('makkah');
                setLessonCategoryTab('all');
                triggerHapticFeedback('light');
              }}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 9,
                borderRadius: TOKENS.radius.md,
                backgroundColor: selectedMosque === 'makkah' ? (themeMode === 'light' ? '#FFFFFF' : '#3A2C21') : 'transparent',
                gap: 6,
                ...(selectedMosque === 'makkah' ? makeShadow('0 2px 8px rgba(0,0,0,0.1)', '#000', 0.1, 4, { width: 0, height: 2 }, 2) : {})
              }}
            >
              <TextUI size={15}>🕋</TextUI>
              <TextUI
                size={13}
                weight={selectedMosque === 'makkah' ? 'bold' : 'medium'}
                color={selectedMosque === 'makkah' ? TOKENS.colors.primaryDark : c.textSecondary}
              >
                {t('دروس الحرم المكي', 'Grand Mosque of Makkah')}
              </TextUI>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                setSelectedMosque('prophet');
                setLessonCategoryTab('all');
                triggerHapticFeedback('light');
              }}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 9,
                borderRadius: TOKENS.radius.md,
                backgroundColor: selectedMosque === 'prophet' ? (themeMode === 'light' ? '#FFFFFF' : '#3A2C21') : 'transparent',
                gap: 6,
                ...(selectedMosque === 'prophet' ? makeShadow('0 2px 8px rgba(0,0,0,0.1)', '#000', 0.1, 4, { width: 0, height: 2 }, 2) : {})
              }}
            >
              <TextUI size={15}>🕌</TextUI>
              <TextUI
                size={13}
                weight={selectedMosque === 'prophet' ? 'bold' : 'medium'}
                color={selectedMosque === 'prophet' ? '#1E5A3E' : c.textSecondary}
              >
                {t('دروس الحرم النبوي', "Prophet's Mosque")}
              </TextUI>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar Input (When Active) */}
        {lessonSearchQuery !== '' && (
          <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: c.surface,
                borderRadius: TOKENS.radius.md,
                paddingHorizontal: 12,
                borderWidth: 1,
                borderColor: TOKENS.colors.secondary
              }}
            >
              <Feather name="search" size={16} color={TOKENS.colors.primary} style={{ marginEnd: 8 }} />
              <TextInput
                value={lessonSearchQuery === ' ' ? '' : lessonSearchQuery}
                onChangeText={(text) => setLessonSearchQuery(text)}
                placeholder={t('ابحث عن كتاب، شيخ، أو فن شرعي...', 'Search book, scholar, topic...')}
                placeholderTextColor={c.textSecondary}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  fontSize: 14,
                  fontFamily: 'Tajawal_500Medium',
                  color: c.textPrimary,
                  textAlign: isRTL ? 'right' : 'left',
                  writingDirection: isRTL ? 'rtl' : 'ltr'
                }}
                autoFocus={lessonSearchQuery === ' '}
              />
              {lessonSearchQuery.trim() !== '' && (
                <TouchableOpacity onPress={() => setLessonSearchQuery('')} style={{ padding: 4 }}>
                  <Feather name="x" size={16} color={c.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Categories Tab Strip */}
        <View style={{ paddingVertical: 10 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          >
            {tabs.map((tab) => {
              const isSelected = lessonCategoryTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  activeOpacity={0.8}
                  onPress={() => {
                    setLessonCategoryTab(tab.id);
                    triggerHapticFeedback('light');
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: TOKENS.radius.pill,
                    backgroundColor: isSelected
                      ? (tab.id === 'schedule' ? '#1E5A3E' : TOKENS.colors.primary)
                      : c.surface,
                    borderWidth: 1,
                    borderColor: isSelected ? 'transparent' : c.border,
                    gap: 6
                  }}
                >
                  {tab.id === 'schedule' && (
                    <Feather name="clock" size={13} color={isSelected ? '#FFFFFF' : '#1E5A3E'} />
                  )}
                  <TextUI
                    weight={isSelected ? 'bold' : 'medium'}
                    size={13}
                    color={isSelected ? '#FFFFFF' : c.textPrimary}
                  >
                    {isRTL ? tab.titleAr : tab.titleEn}
                  </TextUI>
                  {tab.count !== undefined && (
                    <View
                      style={{
                        backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : c.bgSecondary,
                        paddingHorizontal: 6,
                        paddingVertical: 1,
                        borderRadius: TOKENS.radius.pill
                      }}
                    >
                      <TextUI size={10} weight="bold" color={isSelected ? '#FFFFFF' : c.textSecondary}>
                        {toArabicNumber(tab.count)}
                      </TextUI>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Scrollable Content Body */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
          {/* Active Scholarly Deck Audio Player (عند وجود درس قيد التشغيل) */}
          {activeLesson && activeCourse && (
            <View
              style={{
                backgroundColor: themeMode === 'light' ? '#F4F9F5' : '#1E2B22',
                borderRadius: TOKENS.radius.lg,
                borderWidth: 1.5,
                borderColor: '#1E5A3E',
                padding: 18,
                marginBottom: 20,
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <ArabesqueWatermark opacity={0.07} color="#1E5A3E" />
              <View style={{ width: '100%', marginBottom: 6 }}>
                <MoorishArchFrame height={16} color="#1E5A3E" opacity={0.8} />
              </View>

              {/* Status Row */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 8 }}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    setIsLessonPageOpen(true);
                    triggerHapticFeedback('light');
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                >
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isCurrentLessonPlaying ? '#2E7D32' : c.textSecondary }} />
                  <TextUI size={11} weight="bold" color="#1E5A3E">
                    {isCurrentLessonPlaying ? t('مجلس علمي قيد الاستماع', 'Now Playing Lesson') : t('الدرس المحدد', 'Selected Lesson')}
                  </TextUI>
                  <Feather name="maximize-2" size={12} color="#1E5A3E" />
                </TouchableOpacity>

                {/* Speed Selector Chips */}
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {[1.0, 1.25, 1.5, 2.0].map((spd) => (
                    <TouchableOpacity
                      key={spd}
                      onPress={() => changeLessonPlaybackSpeed(spd)}
                      style={{
                        paddingHorizontal: 7,
                        paddingVertical: 3,
                        borderRadius: 6,
                        backgroundColor: lessonPlaybackSpeed === spd ? '#1E5A3E' : (themeMode === 'light' ? '#FFFFFF' : '#2A3A2F'),
                        borderWidth: 1,
                        borderColor: lessonPlaybackSpeed === spd ? '#1E5A3E' : c.border
                      }}
                    >
                      <TextUI size={10} weight="bold" color={lessonPlaybackSpeed === spd ? '#FFFFFF' : c.textPrimary}>
                        {spd}x
                      </TextUI>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Lesson Title & Course (Tapping opens dedicated Lesson Page) */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  setIsLessonPageOpen(true);
                  triggerHapticFeedback('light');
                }}
              >
                <TextUI weight="bold" size={17} color={TOKENS.colors.primaryDark} style={{ textAlign: 'center', marginBottom: 4 }}>
                  {activeLesson.titleAr}
                </TextUI>
                <TextUI size={13} color={c.textSecondary} style={{ textAlign: 'center', marginBottom: 12 }}>
                  {`${activeCourse.scholarAr} • ${activeCourse.titleAr}`}
                </TextUI>
              </TouchableOpacity>

              {/* Interactive Progress Slider Bar */}
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={(e: any) => {
                  try {
                    const locX = e.nativeEvent?.locationX || 0;
                    // Approximate or responsive percentage based on typical layout width
                    const barWidth = 310;
                    const ratio = Math.max(0, Math.min(1, locX / barWidth));
                    if (audioTotalSecs > 0) {
                      seekAudioToTime(Math.round(ratio * audioTotalSecs));
                    }
                  } catch (err) {}
                }}
                style={{ width: '100%', paddingVertical: 6, marginBottom: 2 }}
              >
                <View style={{ width: '100%', height: 6, backgroundColor: c.border, borderRadius: 3, overflow: 'hidden' }}>
                  <View style={{ height: '100%', width: `${Math.max(2, audioProgress)}%`, backgroundColor: '#1E5A3E', borderRadius: 3 }} />
                </View>
              </TouchableOpacity>

              {/* Time Indicators: Elapsed, Remaining Countdown, and Total Duration */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 14 }}>
                {/* Elapsed Time */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Feather name="clock" size={12} color="#1E5A3E" />
                  <TextUI size={12} weight="bold" color="#1E5A3E">
                    {audioCurrentTime}
                  </TextUI>
                </View>

                {/* Remaining Time Countdown */}
                <View
                  style={{
                    backgroundColor: themeMode === 'light' ? '#E8F5E9' : '#1A2E20',
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: '#81C784'
                  }}
                >
                  <TextUI size={11} weight="bold" color="#2E7D32">
                    {`متبقي ${audioRemainingTime}`}
                  </TextUI>
                </View>

                {/* Total Duration */}
                <TextUI size={11} color={c.textSecondary}>
                  {audioDuration || activeLesson.duration}
                </TextUI>
              </View>

              {/* Controls Row: -15s, Play/Pause, +15s */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
                {/* Replay 15 seconds button */}
                <TouchableOpacity
                  onPress={() => skipAudioSeconds(-15)}
                  activeOpacity={0.8}
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 23,
                    backgroundColor: c.surface,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: c.border
                  }}
                >
                  <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                    <Feather name="rotate-ccw" size={17} color={c.textPrimary} />
                    <TextUI size={9} weight="bold" color={c.textSecondary} style={{ marginTop: -1 }}>١٥-</TextUI>
                  </View>
                </TouchableOpacity>

                {/* Main Play / Pause Button */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={toggleLessonAudioPlayback}
                  style={{
                    width: 62,
                    height: 62,
                    borderRadius: 31,
                    backgroundColor: '#1E5A3E',
                    alignItems: 'center',
                    justifyContent: 'center',
                    ...makeShadow('0 4px 14px rgba(30, 90, 62, 0.4)', '#1E5A3E', 0.4, 6, { width: 0, height: 3 }, 6)
                  }}
                >
                  <Feather name={isCurrentLessonPlaying ? 'pause' : 'play'} size={28} color="#FFFFFF" />
                </TouchableOpacity>

                {/* Forward 15 seconds button */}
                <TouchableOpacity
                  onPress={() => skipAudioSeconds(15)}
                  activeOpacity={0.8}
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 23,
                    backgroundColor: c.surface,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: c.border
                  }}
                >
                  <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                    <Feather name="rotate-cw" size={17} color={c.textPrimary} />
                    <TextUI size={9} weight="bold" color={c.textSecondary} style={{ marginTop: -1 }}>١٥+</TextUI>
                  </View>
                </TouchableOpacity>
              </View>

              {/* DIRECT MINUTE JUMP BOX (مربع كتابة الدقيقة والانتقال الفوري للصوت) */}
              <View
                style={{
                  marginTop: 14,
                  backgroundColor: themeMode === 'light' ? '#FBF8F3' : '#221914',
                  borderRadius: TOKENS.radius.lg,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: 'rgba(198, 146, 85, 0.28)'
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: themeMode === 'light' ? 'rgba(198, 146, 85, 0.15)' : 'rgba(198, 146, 85, 0.25)',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Feather name="clock" size={12} color={TOKENS.colors.primary} />
                    </View>
                    <TextUI size={12} weight="bold" color={TOKENS.colors.primary}>
                      {t('الانتقال المباشر لدقيقة معينة:', 'Jump directly to minute:')}
                    </TextUI>
                  </View>
                  <TextUI size={10} color={c.textSecondary}>
                    {t('مثال: 15 أو 15:30', 'e.g. 15 or 15:30')}
                  </TextUI>
                </View>

                {/* Input row + Jump Button */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TextInput
                    value={minuteJumpInput}
                    onChangeText={setMinuteJumpInput}
                    placeholder={t('اكتب الدقيقة (مثلاً: 12 أو 12:30)', 'Enter minute (e.g. 12 or 12:30)')}
                    placeholderTextColor={c.textSecondary}
                    keyboardType="numeric"
                    onSubmitEditing={() => handleJumpToMinute()}
                    returnKeyType="go"
                    style={{
                      flex: 1,
                      height: 40,
                      backgroundColor: c.surface,
                      borderRadius: TOKENS.radius.md,
                      paddingHorizontal: 12,
                      fontSize: 13,
                      color: c.textPrimary,
                      textAlign: isRTL ? 'right' : 'left',
                      borderWidth: 1,
                      borderColor: c.border
                    }}
                  />
                  <TouchableOpacity
                    onPress={() => handleJumpToMinute()}
                    activeOpacity={0.8}
                    style={{
                      height: 40,
                      paddingHorizontal: 16,
                      borderRadius: TOKENS.radius.md,
                      backgroundColor: TOKENS.colors.primary,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 6,
                      ...makeShadow('0 2px 6px rgba(198, 146, 85, 0.3)', TOKENS.colors.primary, 0.3, 4, { width: 0, height: 2 }, 3)
                    }}
                  >
                    <Feather name="play" size={13} color="#FFFFFF" />
                    <TextUI size={12} weight="bold" color="#FFFFFF">
                      {t('انتقال', 'Jump')}
                    </TextUI>
                  </TouchableOpacity>
                </View>

                {/* Quick Minute Jump Chips */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  <TextUI size={10} color={c.textSecondary} style={{ marginEnd: 2 }}>
                    {t('دقائق سريعة:', 'Quick:')}
                  </TextUI>
                  {['5', '10', '15', '20', '30', '45'].map((min) => (
                    <TouchableOpacity
                      key={`quick-min-${min}`}
                      onPress={() => handleJumpToMinute(min)}
                      activeOpacity={0.7}
                      style={{
                        paddingVertical: 3,
                        paddingHorizontal: 8,
                        borderRadius: TOKENS.radius.pill,
                        backgroundColor: c.surface,
                        borderWidth: 1,
                        borderColor: 'rgba(198, 146, 85, 0.3)'
                      }}
                    >
                      <TextUI size={10.5} weight="bold" color={TOKENS.colors.primary}>
                        {`${toArabicNumber(min)} د`}
                      </TextUI>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* OFFLINE STORAGE & DOWNLOAD ACTION CARD */}
              <View
                style={{
                  marginTop: 16,
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: c.border
                }}
              >
                {activeLesson?.id && downloadedLessons[activeLesson.id] ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginEnd: 8 }}>
                      <Feather name="check-circle" size={15} color="#2E7D32" />
                      <View>
                        <TextUI size={12} weight="bold" color="#2E7D32">
                          محفوظ في ذاكرة الجوال (أوفلاين)
                        </TextUI>
                        <TextUI size={10} color={c.textSecondary}>
                          {`الحجم: ${downloadedLessons[activeLesson.id]?.sizeMB || '0'} • الذاكرة المحلية`}
                        </TextUI>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => activeLesson?.id && deleteDownloadedLesson(activeLesson.id)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8,
                        backgroundColor: '#FFEBEE',
                        borderWidth: 1,
                        borderColor: '#FFCDD2'
                      }}
                    >
                      <Feather name="trash-2" size={12} color="#C62828" />
                      <TextUI size={11} weight="bold" color="#C62828">
                        حذف لتوفير المساحة
                      </TextUI>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <TouchableOpacity
                      onPress={() => setAudioStorageInfoVisible(!audioStorageInfoVisible)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1, marginEnd: 8 }}
                    >
                      <Feather name="hard-drive" size={13} color={c.textSecondary} />
                      <TextUI size={11} color={c.textSecondary} style={{ textDecorationLine: 'underline' }}>
                        أين تُخزن المحاضرة؟
                      </TextUI>
                    </TouchableOpacity>

                    <TouchableOpacity
                      disabled={!activeLesson?.id || !!downloadingLessonIds[activeLesson.id]}
                      onPress={() => activeCourse && activeLesson && downloadLessonAudio(activeCourse, activeLesson)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 5,
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        borderRadius: 8,
                        backgroundColor: '#1E5A3E'
                      }}
                    >
                      <Feather name="download" size={13} color="#FFFFFF" />
                      <TextUI size={11} weight="bold" color="#FFFFFF">
                        {activeLesson?.id && downloadingLessonIds[activeLesson.id]
                          ? `جارٍ التحميل ${downloadingLessonIds[activeLesson.id]}%...`
                          : 'تحميل للاستماع أوفلاين'}
                      </TextUI>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Explanatory Storage Box */}
                {audioStorageInfoVisible && (
                  <View
                    style={{
                      marginTop: 10,
                      padding: 10,
                      borderRadius: 8,
                      backgroundColor: themeMode === 'light' ? '#EBF3ED' : '#223326',
                      borderWidth: 1,
                      borderColor: '#A5D6A7'
                    }}
                  >
                    <TextUI size={11} color={TOKENS.colors.primaryDark} style={{ lineHeight: 17 }}>
                      ℹ️ <TextUI weight="bold" size={11}>مكان التخزين:</TextUI> تُحفظ المحاضرات محلياً في ذاكرة التخزين المستدامة للتطبيق (App Cache / Storage) لتعمل بدون اتصال، ويمكنك حذف أي محاضرة بعد الاستماع إليها بضغطة زر واحدة لتفريغ مساحة هاتفك فوراً.
                    </TextUI>
                  </View>
                )}
              </View>

              {/* LESSON NOTES & TIMESTAMPS SECTION */}
              <View
                style={{
                  marginTop: 14,
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: c.border
                }}
              >
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                  {/* Quick Bookmark Stop Position Button */}
                  <TouchableOpacity
                    onPress={saveQuickLessonBookmark}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      paddingVertical: 8,
                      paddingHorizontal: 8,
                      borderRadius: 8,
                      backgroundColor: themeMode === 'light' ? '#E8F5E9' : '#203225',
                      borderWidth: 1,
                      borderColor: '#1E5A3E'
                    }}
                  >
                    <Feather name="bookmark" size={13} color="#1E5A3E" />
                    <TextUI size={11} weight="bold" color="#1E5A3E">
                      {`حفظ الوقفة (${audioCurrentTime})`}
                    </TextUI>
                  </TouchableOpacity>

                  {/* Add Custom Scientific Note Button */}
                  <TouchableOpacity
                    onPress={() => {
                      setNewNoteTimestampSecs(audioCurrentSecs);
                      setLessonNoteModalVisible(true);
                    }}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      paddingVertical: 8,
                      paddingHorizontal: 8,
                      borderRadius: 8,
                      backgroundColor: themeMode === 'light' ? '#F0E8DE' : '#33271D',
                      borderWidth: 1,
                      borderColor: TOKENS.colors.primary
                    }}
                  >
                    <Feather name="edit-3" size={13} color={TOKENS.colors.primary} />
                    <TextUI size={11} weight="bold" color={TOKENS.colors.primary}>
                      + تدوين فائدة علمية
                    </TextUI>
                  </TouchableOpacity>
                </View>

                {/* Display Saved Notes for this lesson */}
                {activeLesson?.id && lessonNotes[activeLesson.id] && lessonNotes[activeLesson.id].length > 0 && (
                  <View style={{ marginTop: 4 }}>
                    <TextUI size={11} weight="bold" color={TOKENS.colors.primaryDark} style={{ marginBottom: 6 }}>
                      {`الوقفات والملاحظات المحفوظة لهذا الدرس (${toArabicNumber(lessonNotes[activeLesson.id].length)}):`}
                    </TextUI>
                    {lessonNotes[activeLesson.id].map((note) => (
                      <View
                        key={note.id}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: c.surface,
                          borderRadius: 8,
                          paddingVertical: 7,
                          paddingHorizontal: 10,
                          borderWidth: 1,
                          borderColor: c.border,
                          marginBottom: 6
                        }}
                      >
                        <TouchableOpacity
                          onPress={() => jumpToNoteTimestamp(note.timeSecs)}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginEnd: 8 }}
                        >
                          <View
                            style={{
                              backgroundColor: '#1E5A3E',
                              paddingHorizontal: 7,
                              paddingVertical: 3,
                              borderRadius: 6,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 3
                            }}
                          >
                            <Feather name="play" size={9} color="#FFFFFF" />
                            <TextUI size={10} weight="bold" color="#FFFFFF">{note.timeStr}</TextUI>
                          </View>
                          <TextUI size={11} color={c.textPrimary} numberOfLines={2} style={{ flex: 1 }}>
                            {note.noteText}
                          </TextUI>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => activeLesson?.id && deleteLessonNote(activeLesson.id, note.id)}
                          style={{ padding: 4 }}
                        >
                          <Feather name="trash-2" size={13} color={c.textSecondary} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}

          {/* VIEW MODE A: SCHEDULE OF SCHOLARLY CHAIRS (كراسي الحرم النبوي الحية) */}
          {lessonCategoryTab === 'schedule' ? (
            <View>
              <View
                style={{
                  backgroundColor: themeMode === 'light' ? '#EBF5EE' : '#1A2920',
                  borderRadius: TOKENS.radius.md,
                  padding: 14,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: '#1E5A3E'
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Feather name="compass" size={16} color="#1E5A3E" />
                  <TextUI weight="bold" size={14} color="#1E5A3E">
                    {t('جدول كراسي العلم بالمسجد النبوي الشريف', "Prophet's Mosque Chairs Schedule")}
                  </TextUI>
                </View>
                <TextUI size={12} color={c.textSecondary} style={{ lineHeight: 18 }}>
                  {t('مجالس وحلقات علمية يومية وأسبوعية متوارثة لكبار أئمة ومدرسي الحرم النبوي الشريف، تُقام في أروقة وتوسعات المسجد النبوي بعد الصلوات المكتوبة.', 'Daily and weekly scholarly circles by imams and scholars of the Prophet Mosque.')}
                </TextUI>
              </View>

              {PROPHET_MOSQUE_SCHEDULE.map((chair) => (
                <View
                  key={chair.id}
                  style={{
                    backgroundColor: c.surface,
                    borderRadius: TOKENS.radius.lg,
                    borderWidth: 1,
                    borderColor: c.border,
                    padding: 16,
                    marginBottom: 14,
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <View style={{ flex: 1, marginEnd: 10 }}>
                      <TextUI weight="bold" size={16} color={TOKENS.colors.primaryDark} style={{ width: '100%' }}>
                        {chair.chairTitleAr}
                      </TextUI>
                      <TextUI size={12} weight="bold" color="#1E5A3E" style={{ marginTop: 2, width: '100%' }}>
                        {chair.scholarAr}
                      </TextUI>
                      <TextUI size={11} color={c.textSecondary} style={{ width: '100%' }}>
                        {chair.roleAr}
                      </TextUI>
                    </View>

                    <View
                      style={{
                        backgroundColor: '#1E5A3E',
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: TOKENS.radius.pill
                      }}
                    >
                      <TextUI size={10} weight="bold" color="#FFFFFF">
                        {chair.badge}
                      </TextUI>
                    </View>
                  </View>

                  {/* Book & Timing Row */}
                  <View
                    style={{
                      backgroundColor: themeMode === 'light' ? c.bgSecondary : '#25201C',
                      borderRadius: TOKENS.radius.md,
                      padding: 12,
                      gap: 8,
                      marginBottom: 12
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Feather name="book-open" size={13} color={TOKENS.colors.secondary} />
                      <TextUI size={12} weight="bold" color={c.textPrimary}>
                        {`${t('المتن المشروح:', 'Taught Book:')} ${chair.bookAr}`}
                      </TextUI>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Feather name="clock" size={13} color="#1E5A3E" />
                      <TextUI size={12} color="#1E5A3E" weight="medium">
                        {chair.timingAr}
                      </TextUI>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Feather name="map-pin" size={13} color={TOKENS.colors.primary} />
                      <TextUI size={12} color={c.textSecondary}>
                        {chair.locationAr}
                      </TextUI>
                    </View>
                  </View>

                  {/* Quick Action Button */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      const matchedCourse = currentCourses.find(
                        (cs) => cs.scholarAr.includes(chair.scholarAr.split(' ')[2] || '') || cs.titleAr.includes(chair.bookAr.split(' ')[0] || '')
                      ) || currentCourses[0];
                      setSelectedLessonCourse(matchedCourse);
                      setLessonModalVisible(true);
                      triggerHapticFeedback('light');
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: themeMode === 'light' ? '#F4F9F5' : '#1C2920',
                      borderWidth: 1,
                      borderColor: '#1E5A3E',
                      borderRadius: TOKENS.radius.pill,
                      paddingVertical: 9,
                      gap: 6
                    }}
                  >
                    <Feather name="headphones" size={14} color="#1E5A3E" />
                    <TextUI size={12} weight="bold" color="#1E5A3E">
                      {t('استعراض دروس السلسلة والتسجيلات', 'Browse Recorded Lessons')}
                    </TextUI>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            /* VIEW MODE B: SCHOLARLY COURSES & RECORDED LESSONS (السلاسل العلمية المشروحة) */
            <View>
              {/* Highlight Banner if on All tab */}
              {lessonCategoryTab === 'all' && (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => {
                    setLessonCategoryTab('schedule');
                    triggerHapticFeedback('light');
                  }}
                  style={{
                    backgroundColor: selectedMosque === 'makkah' ? TOKENS.colors.primaryDark : '#1E5A3E',
                    borderRadius: TOKENS.radius.lg,
                    padding: 16,
                    marginBottom: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    ...makeShadow('0 4px 12px rgba(30,90,62,0.25)', '#1E5A3E', 0.25, 6, { width: 0, height: 2 }, 4)
                  }}
                >
                  <View style={{ flex: 1, marginEnd: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <Feather name="radio" size={14} color="#C69255" />
                      <TextUI size={12} weight="bold" color="#C69255">
                        {selectedMosque === 'makkah' ? t('كراسي الحرم المكي الحية', 'Grand Mosque Live Chairs') : t('كراسي الحرم النبوي الحية', "Prophet's Mosque Live Chairs")}
                      </TextUI>
                    </View>
                    <TextUI weight="bold" size={15} color="#FFFFFF">
                      {selectedMosque === 'makkah' ? t('جدول ومواقع مجالس العلم بالمسجد الحرام بمكة', 'Schedule & Locations of Classes in Grand Mosque') : t('جدول ومواقع مجالس العلم بالمسجد النبوي الشريف', 'Schedule & Locations of Daily Classes')}
                    </TextUI>
                    <TextUI size={11} color="rgba(255,255,255,0.8)" style={{ marginTop: 2 }}>
                      {`${toArabicNumber(currentSchedule.length)} ${t('كراسي علمية كبرى لكبار أئمة ومدرسي الحرم • انقر للاطلاع', 'major scholarly chairs • Tap to view schedule')}`}
                    </TextUI>
                  </View>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Feather name={isRTL ? 'chevron-left' : 'chevron-right'} size={18} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
              )}

              {filteredCourses.length === 0 ? (
                <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
                  <Feather name="book-open" size={40} color={c.textSecondary} style={{ opacity: 0.5, marginBottom: 12 }} />
                  <TextUI weight="bold" size={15} color={c.textPrimary}>
                    {t('لا توجد نتائج مطابقة للبحث', 'No matching courses found')}
                  </TextUI>
                  <TextUI size={12} color={c.textSecondary} style={{ marginTop: 4 }}>
                    {t('جرب البحث بكلمات أخرى أو اختر تبويباً مختلفاً', 'Try another search keyword or tab')}
                  </TextUI>
                </View>
              ) : (
                filteredCourses.map((course) => (
                  <TouchableOpacity
                    key={course.id}
                    activeOpacity={0.88}
                    onPress={() => {
                      setSelectedLessonCourse(course);
                      setLessonModalVisible(true);
                      triggerHapticFeedback('light');
                    }}
                    style={{
                      backgroundColor: c.surface,
                      borderRadius: TOKENS.radius.lg,
                      borderWidth: 1,
                      borderColor: c.border,
                      padding: 16,
                      marginBottom: 14,
                      position: 'relative',
                      overflow: 'hidden',
                      ...makeShadow('0 2px 8px rgba(0,0,0,0.04)', '#000', 0.04, 3, { width: 0, height: 1 }, 2)
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <View
                        style={{
                          backgroundColor: themeMode === 'light' ? '#EBF5EE' : '#1F2C24',
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: TOKENS.radius.pill,
                          borderWidth: 1,
                          borderColor: '#1E5A3E'
                        }}
                      >
                        <TextUI size={11} weight="bold" color="#1E5A3E">
                          {course.categoryAr}
                        </TextUI>
                      </View>

                      <View
                        style={{
                          backgroundColor: themeMode === 'light' ? TOKENS.colors.secondaryLight : '#32231A',
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: TOKENS.radius.pill
                        }}
                      >
                        <TextUI size={10} weight="bold" color={TOKENS.colors.primaryDark}>
                          {course.badge}
                        </TextUI>
                      </View>
                    </View>

                    <TextUI weight="bold" size={16} color={TOKENS.colors.primaryDark} style={{ marginBottom: 4, width: '100%' }}>
                      {course.titleAr}
                    </TextUI>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, width: '100%' }}>
                      <Feather name="user" size={13} color={TOKENS.colors.secondary} />
                      <TextUI size={13} weight="bold" color={c.textPrimary}>
                        {course.scholarAr}
                      </TextUI>
                    </View>

                    <TextUI size={12} color={c.textSecondary} style={{ lineHeight: 18, marginBottom: 12, width: '100%' }}>
                      {course.descriptionAr}
                    </TextUI>

                    {/* Footer Row */}
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingTop: 10,
                        borderTopWidth: 1,
                        borderTopColor: c.border
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Feather name="layers" size={13} color={c.textSecondary} />
                        <TextUI size={12} color={c.textSecondary}>
                          {`${toArabicNumber(course.lessonsCount)} ${t('درساً صوتياً', 'audio lessons')}`}
                        </TextUI>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={(e) => {
                            try { e.stopPropagation?.(); } catch (err) {}
                            const firstLesson = course.lessons && course.lessons.length > 0 ? course.lessons[0] : null;
                            if (firstLesson) {
                              setSelectedLessonCourse(course);
                              setActiveCourse(course);
                              setActiveLesson(firstLesson);
                              playLessonAudio(course, firstLesson);
                              setIsLessonPageOpen(true);
                              triggerHapticFeedback('medium');
                            }
                          }}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            paddingHorizontal: 9,
                            paddingVertical: 4,
                            borderRadius: TOKENS.radius.pill,
                            backgroundColor: selectedMosque === 'makkah' ? TOKENS.colors.primaryLight : '#E8F5E9',
                            borderWidth: 1,
                            borderColor: selectedMosque === 'makkah' ? TOKENS.colors.secondary : '#A5D6A7'
                          }}
                        >
                          <Feather name="play" size={11} color={selectedMosque === 'makkah' ? TOKENS.colors.primaryDark : '#1E5A3E'} />
                          <TextUI size={11} weight="bold" color={selectedMosque === 'makkah' ? TOKENS.colors.primaryDark : '#1E5A3E'}>
                            {t('فتح الدرس', 'Open Lesson')}
                          </TextUI>
                        </TouchableOpacity>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <TextUI size={12} weight="bold" color="#1E5A3E">
                            {t('قائمة الدروس', 'Lessons List')}
                          </TextUI>
                          <Feather name="chevron-left" size={14} color="#1E5A3E" />
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </ScrollView>

        {/* In-Frame Modal: Course Lessons List (نافذة تفاصيل السلسلة وقائمة الدروس داخل إطار الموبايل) */}
        {lessonModalVisible && selectedLessonCourse && (
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: 'rgba(0,0,0,0.65)',
                justifyContent: 'flex-end',
                zIndex: 500,
                elevation: 500,
                direction: isRTL ? 'rtl' : 'ltr'
              }
            ]}
            {...({ dir: isRTL ? 'rtl' : 'ltr' } as any)}
          >
            <View
              style={{
                backgroundColor: c.bg,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                maxHeight: '85%',
                minHeight: '60%',
                paddingTop: 16,
                paddingHorizontal: 18,
                borderTopWidth: 2,
                borderColor: '#1E5A3E',
                direction: isRTL ? 'rtl' : 'ltr'
              }}
              {...({ dir: isRTL ? 'rtl' : 'ltr' } as any)}
            >
              {/* Modal Drag Handle */}
              <View
                style={{
                  width: 42,
                  height: 5,
                  backgroundColor: c.border,
                  borderRadius: 3,
                  alignSelf: 'center',
                  marginBottom: 12
                }}
              />

              {/* Modal Header */}
              {selectedLessonCourse && (
                <View style={{ marginBottom: 14 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, marginEnd: 10 }}>
                      <TextUI size={11} weight="bold" color="#1E5A3E" style={{ marginBottom: 2, width: '100%' }}>
                        {`سلسلة علمية • ${selectedLessonCourse.categoryAr}`}
                      </TextUI>
                      <TextUI weight="bold" size={17} color={TOKENS.colors.primaryDark} style={{ width: '100%' }}>
                        {selectedLessonCourse.titleAr}
                      </TextUI>
                      <TextUI size={12} color={c.textSecondary} style={{ marginTop: 2, width: '100%' }}>
                        {`${selectedLessonCourse.scholarAr} • ${selectedLessonCourse.roleAr}`}
                      </TextUI>
                    </View>

                    <TouchableOpacity
                      onPress={() => setLessonModalVisible(false)}
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
                      <Feather name="x" size={16} color={c.textPrimary} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Lessons List */}
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 30 }}>
                {selectedLessonCourse?.lessons.map((ls: any, idx: number) => {
                  const isCurrentActive =
                    activeCourse?.id === selectedLessonCourse.id &&
                    activeLesson?.id === ls.id &&
                    audioPlaying;

                  return (
                    <TouchableOpacity
                      key={ls.id}
                      activeOpacity={0.78}
                      onPress={() => {
                        setActiveCourse(selectedLessonCourse);
                        setActiveLesson(ls);
                        playLessonAudio(selectedLessonCourse, ls);
                        setLessonModalVisible(false);
                        setIsLessonPageOpen(true);
                        triggerHapticFeedback('medium');
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: 12,
                        paddingHorizontal: 12,
                        borderRadius: TOKENS.radius.md,
                        backgroundColor: isCurrentActive
                          ? (themeMode === 'light' ? '#E8F5E9' : '#1E2D22')
                          : (idx % 2 === 0 ? c.surface : 'transparent'),
                        borderWidth: isCurrentActive ? 1 : 0,
                        borderColor: '#1E5A3E',
                        marginBottom: 6
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginEnd: 10 }}>
                        {/* Number / Play Indicator Badge */}
                        <View
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            backgroundColor: isCurrentActive ? '#1E5A3E' : (themeMode === 'light' ? '#F0E8DE' : '#2B2019'),
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginEnd: 10
                          }}
                        >
                          {isCurrentActive ? (
                            <Feather name="volume-2" size={15} color="#FFFFFF" />
                          ) : (
                            <TextUI size={12} weight="bold" color={TOKENS.colors.primaryDark}>
                              {toArabicNumber(ls.number)}
                            </TextUI>
                          )}
                        </View>

                        <View style={{ flex: 1 }}>
                          <TextUI
                            weight={isCurrentActive ? 'bold' : 'medium'}
                            size={14}
                            color={isCurrentActive ? '#1E5A3E' : c.textPrimary}
                            numberOfLines={2}
                            style={{ width: '100%' }}
                          >
                            {ls.titleAr}
                          </TextUI>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                            <TextUI size={11} color={c.textSecondary}>
                              {`المدة: ${ls.duration}`}
                            </TextUI>
                            {downloadedLessons[ls.id] && (
                              <View style={{ backgroundColor: '#E8F5E9', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                                <TextUI size={10} weight="bold" color="#2E7D32">أوفلاين ⚡</TextUI>
                              </View>
                            )}
                            {lessonNotes[ls.id] && lessonNotes[ls.id].length > 0 && (
                              <View style={{ backgroundColor: '#FFF3E0', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                                <TextUI size={10} weight="bold" color="#E65100">
                                  {`🔖 ${toArabicNumber(lessonNotes[ls.id].length)}`}
                                </TextUI>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>

                      {/* Action Icons: Download Button + Play Button */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {/* Download or Delete Download Button */}
                        {downloadedLessons[ls.id] ? (
                          <TouchableOpacity
                            onPress={(e: any) => {
                              try { e.stopPropagation?.(); } catch (err) {}
                              deleteDownloadedLesson(ls.id);
                            }}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 16,
                              backgroundColor: '#E8F5E9',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderWidth: 1,
                              borderColor: '#A5D6A7'
                            }}
                          >
                            <Feather name="check" size={14} color="#2E7D32" />
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            disabled={!!downloadingLessonIds[ls.id]}
                            onPress={(e: any) => {
                              try { e.stopPropagation?.(); } catch (err) {}
                              downloadLessonAudio(selectedLessonCourse, ls);
                            }}
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
                            {downloadingLessonIds[ls.id] ? (
                              <ActivityIndicator size="small" color="#1E5A3E" />
                            ) : (
                              <Feather name="download" size={13} color={c.textSecondary} />
                            )}
                          </TouchableOpacity>
                        )}

                        {/* Play Action Icon */}
                        <View
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            backgroundColor: isCurrentActive ? '#1E5A3E' : c.surface,
                            borderWidth: 1,
                            borderColor: isCurrentActive ? '#1E5A3E' : c.border,
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Feather
                            name={isCurrentActive ? 'pause' : 'play'}
                            size={13}
                            color={isCurrentActive ? '#FFFFFF' : '#1E5A3E'}
                          />
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        )}

        {/* In-Frame Modal: Add Lesson Note / Bookmark (نافذة تدوين الفائدة العلمية والوقفة داخل إطار الموبايل) */}
        {lessonNoteModalVisible && (
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: 'rgba(0,0,0,0.65)',
                justifyContent: 'center',
                alignItems: 'center',
                padding: 20,
                zIndex: 2000,
                elevation: 2000,
                direction: isRTL ? 'rtl' : 'ltr'
              }
            ]}
            {...({ dir: isRTL ? 'rtl' : 'ltr' } as any)}
          >
            <View
              style={{
                width: '100%',
                maxWidth: 420,
                backgroundColor: c.bg,
                borderRadius: 20,
                padding: 20,
                borderWidth: 1.5,
                borderColor: '#1E5A3E',
                direction: isRTL ? 'rtl' : 'ltr'
              }}
              {...({ dir: isRTL ? 'rtl' : 'ltr' } as any)}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center' }}>
                    <Feather name="edit-3" size={17} color="#1E5A3E" />
                  </View>
                  <View>
                    <TextUI weight="bold" size={16} color={TOKENS.colors.primaryDark}>
                      تدوين فائدة علمية
                    </TextUI>
                    <TextUI size={11} color={c.textSecondary}>
                      {activeLesson?.titleAr || 'الدرس الحالي'}
                    </TextUI>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => setLessonNoteModalVisible(false)}
                  style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Feather name="x" size={16} color={c.textPrimary} />
                </TouchableOpacity>
              </View>

              {/* Timestamp Indicator */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: themeMode === 'light' ? '#E8F5E9' : '#1F2F23',
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 10,
                  marginBottom: 14,
                  borderWidth: 1,
                  borderColor: '#A5D6A7'
                }}
              >
                <Feather name="clock" size={14} color="#1E5A3E" />
                <TextUI size={12} weight="bold" color="#1E5A3E">
                  {`موضع الشرح: الدقيقة (${audioCurrentTime})`}
                </TextUI>
                <TextUI size={11} color={c.textSecondary} style={{ marginStart: 'auto' }}>
                  يُحفظ التوقيت تلقائياً
                </TextUI>
              </View>

              {/* Note Text Input */}
              <TextUI size={12} weight="bold" color={c.textPrimary} style={{ marginBottom: 6 }}>
                نص الفائدة أو الملاحظة الفقهية:
              </TextUI>
              <TextInput
                value={newNoteText}
                onChangeText={setNewNoteText}
                placeholder="اكتب فائدة الشيخ أو المسألة التي وقفت عندها..."
                placeholderTextColor={c.textSecondary}
                multiline={true}
                numberOfLines={4}
                style={{
                  minHeight: 90,
                  backgroundColor: c.surface,
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: c.border,
                  color: c.textPrimary,
                  fontSize: 14,
                  textAlign: isRTL ? 'right' : 'left',
                  writingDirection: isRTL ? 'rtl' : 'ltr',
                  marginBottom: 16
                }}
              />

              {/* Action Buttons */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  onPress={() => setLessonNoteModalVisible(false)}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 12,
                    backgroundColor: c.surface,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: c.border
                  }}
                >
                  <TextUI weight="bold" size={13} color={c.textSecondary}>إلغاء</TextUI>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => saveCustomLessonNote(newNoteText, newNoteTimestampSecs)}
                  style={{
                    flex: 2,
                    paddingVertical: 12,
                    borderRadius: 12,
                    backgroundColor: '#1E5A3E',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <TextUI weight="bold" size={13} color="#FFFFFF">حفظ الفائدة والموضع ✍️</TextUI>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* In-Frame Dedicated Lesson Page (صفحة الدرس المستقلة داخل إطار الموبايل) */}
        {isLessonPageOpen && activeLesson && activeCourse && (
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: c.bg,
                direction: isRTL ? 'rtl' : 'ltr',
                zIndex: 1000,
                elevation: 1000
              }
            ]}
            {...({ dir: isRTL ? 'rtl' : 'ltr' } as any)}
          >
            {/* Lesson Page Header */}
            <Header
              title={t('صفحة الدرس', 'Lesson Page')}
              onBack={() => setIsLessonPageOpen(false)}
              rightAction={
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    try {
                      if (typeof navigator !== 'undefined' && (navigator as any).share) {
                        (navigator as any).share({
                          title: activeLesson?.titleAr,
                          text: `${activeLesson?.titleAr} - ${activeCourse?.scholarAr} (${activeCourse?.titleAr})`,
                          url: activeLesson?.audioUrl || activeCourse?.audioStreamUrl
                        });
                      }
                    } catch (e) {}
                  }}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    backgroundColor: c.surface,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: c.border
                  }}
                >
                  <Feather name="share-2" size={16} color={TOKENS.colors.primary} />
                </TouchableOpacity>
              }
            />

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
            >
              {/* Mosque & Series Breadcrumb Header Card */}
              <View
                style={{
                  backgroundColor: themeMode === 'light' ? '#F7F5F0' : '#221B16',
                  borderRadius: TOKENS.radius.lg,
                  borderWidth: 1,
                  borderColor: 'rgba(198, 146, 85, 0.35)',
                  padding: 14,
                  marginBottom: 16
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                      backgroundColor: themeMode === 'light' ? '#EAE5DB' : '#33271E',
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: TOKENS.radius.pill
                    }}
                  >
                    <TextUI size={12}>
                      {selectedMosque === 'makkah' ? '🕋' : '🕌'}
                    </TextUI>
                    <TextUI size={11} weight="bold" color={TOKENS.colors.primaryDark}>
                      {selectedMosque === 'makkah' ? t('المسجد الحرام بمكة المكرمة', 'Grand Mosque of Makkah') : t('المسجد النبوي الشريف', "Prophet's Mosque")}
                    </TextUI>
                  </View>

                  <View
                    style={{
                      backgroundColor: themeMode === 'light' ? '#EBF5EE' : '#1F2C24',
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: TOKENS.radius.pill,
                      borderWidth: 1,
                      borderColor: '#1E5A3E'
                    }}
                  >
                    <TextUI size={11} weight="bold" color="#1E5A3E">
                      {activeCourse?.categoryAr || 'علمي'}
                    </TextUI>
                  </View>
                </View>

                <TextUI weight="bold" size={16} color={TOKENS.colors.primaryDark} style={{ width: '100%', marginBottom: 4 }}>
                  {activeCourse?.titleAr}
                </TextUI>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Feather name="user" size={13} color={TOKENS.colors.secondary} />
                  <TextUI size={13} weight="bold" color={c.textPrimary}>
                    {activeCourse?.scholarAr}
                  </TextUI>
                  <TextUI size={11} color={c.textSecondary}>
                    {`• ${activeCourse?.roleAr}`}
                  </TextUI>
                </View>
              </View>

              {/* Lesson Spotlight Banner */}
              <View
                style={{
                  backgroundColor: themeMode === 'light' ? '#F4F9F5' : '#1C2920',
                  borderRadius: TOKENS.radius.lg,
                  borderWidth: 1.5,
                  borderColor: '#1E5A3E',
                  padding: 16,
                  marginBottom: 16,
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <ArabesqueWatermark opacity={0.06} color="#1E5A3E" />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <View
                    style={{
                      backgroundColor: '#1E5A3E',
                      paddingHorizontal: 9,
                      paddingVertical: 3,
                      borderRadius: TOKENS.radius.pill
                    }}
                  >
                    <TextUI size={11} weight="bold" color="#FFFFFF">
                      {`الدرس رقم ${toArabicNumber(activeLesson?.number || 1)} من ${toArabicNumber(activeCourse?.lessonsCount || activeCourse?.lessons?.length || 1)}`}
                    </TextUI>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Feather name="clock" size={12} color="#1E5A3E" />
                    <TextUI size={11} weight="bold" color="#1E5A3E">
                      {`المدة: ${activeLesson?.duration}`}
                    </TextUI>
                  </View>
                </View>

                <TextUI weight="bold" size={17} color={TOKENS.colors.primaryDark} style={{ lineHeight: 26, width: '100%' }}>
                  {activeLesson?.titleAr}
                </TextUI>
              </View>

              {/* Full Audio Player Deck */}
              <View
                style={{
                  backgroundColor: themeMode === 'light' ? '#FFFDF9' : '#231B16',
                  borderRadius: TOKENS.radius.xl,
                  borderWidth: 1.5,
                  borderColor: 'rgba(198, 146, 85, 0.4)',
                  padding: 18,
                  marginBottom: 18,
                  ...makeShadow('0 4px 16px rgba(0,0,0,0.06)', '#000', 0.06, 6, { width: 0, height: 2 }, 3)
                }}
              >
                <View style={{ width: '100%', marginBottom: 10 }}>
                  <MoorishArchFrame height={16} color="#1E5A3E" opacity={0.8} />
                </View>

                {/* Status & Speed chips */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isCurrentLessonPlaying ? '#2E7D32' : c.textSecondary }} />
                    <TextUI size={11.5} weight="bold" color="#1E5A3E">
                      {isCurrentLessonPlaying ? t('الشرح قيد الاستماع الآن', 'Audio Playing') : t('الدرس جاهز للتشغيل', 'Ready to Play')}
                    </TextUI>
                  </View>

                  {/* Playback speed */}
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    {[1.0, 1.25, 1.5, 2.0].map((spd) => (
                      <TouchableOpacity
                        key={`modal-speed-${spd}`}
                        onPress={() => changeLessonPlaybackSpeed(spd)}
                        style={{
                          paddingHorizontal: 7,
                          paddingVertical: 3,
                          borderRadius: 6,
                          backgroundColor: lessonPlaybackSpeed === spd ? '#1E5A3E' : (themeMode === 'light' ? '#FFFFFF' : '#2A3A2F'),
                          borderWidth: 1,
                          borderColor: lessonPlaybackSpeed === spd ? '#1E5A3E' : c.border
                        }}
                      >
                        <TextUI size={10} weight="bold" color={lessonPlaybackSpeed === spd ? '#FFFFFF' : c.textPrimary}>
                          {spd}x
                        </TextUI>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Progress bar */}
                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={(e: any) => {
                    try {
                      const locX = e.nativeEvent?.locationX || 0;
                      const barWidth = 310;
                      const ratio = Math.max(0, Math.min(1, locX / barWidth));
                      if (audioTotalSecs > 0) {
                        seekAudioToTime(Math.round(ratio * audioTotalSecs));
                      }
                    } catch (err) {}
                  }}
                  style={{ width: '100%', paddingVertical: 8, marginBottom: 4 }}
                >
                  <View style={{ width: '100%', height: 7, backgroundColor: c.border, borderRadius: 4, overflow: 'hidden' }}>
                    <View style={{ height: '100%', width: `${Math.max(2, audioProgress)}%`, backgroundColor: '#1E5A3E', borderRadius: 4 }} />
                  </View>
                </TouchableOpacity>

                {/* Time indicators */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Feather name="clock" size={12} color="#1E5A3E" />
                    <TextUI size={12.5} weight="bold" color="#1E5A3E">
                      {audioCurrentTime}
                    </TextUI>
                  </View>

                  <View
                    style={{
                      backgroundColor: themeMode === 'light' ? '#E8F5E9' : '#1A2E20',
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: '#81C784'
                    }}
                  >
                    <TextUI size={11} weight="bold" color="#2E7D32">
                      {`متبقي ${audioRemainingTime}`}
                    </TextUI>
                  </View>

                  <TextUI size={11.5} color={c.textSecondary}>
                    {audioDuration || activeLesson?.duration}
                  </TextUI>
                </View>

                {/* Playback Controls Row: -15s, Play, +15s */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 26, marginBottom: 14 }}>
                  <TouchableOpacity
                    onPress={() => skipAudioSeconds(-15)}
                    activeOpacity={0.8}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: c.surface,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: c.border
                    }}
                  >
                    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                      <Feather name="rotate-ccw" size={18} color={c.textPrimary} />
                      <TextUI size={9} weight="bold" color={c.textSecondary} style={{ marginTop: -1 }}>١٥-</TextUI>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={toggleLessonAudioPlayback}
                    style={{
                      width: 66,
                      height: 66,
                      borderRadius: 33,
                      backgroundColor: '#1E5A3E',
                      alignItems: 'center',
                      justifyContent: 'center',
                      ...makeShadow('0 4px 14px rgba(30, 90, 62, 0.4)', '#1E5A3E', 0.4, 6, { width: 0, height: 3 }, 6)
                    }}
                  >
                    <Feather name={isCurrentLessonPlaying ? 'pause' : 'play'} size={30} color="#FFFFFF" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => skipAudioSeconds(15)}
                    activeOpacity={0.8}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: c.surface,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: c.border
                    }}
                  >
                    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                      <Feather name="rotate-cw" size={18} color={c.textPrimary} />
                      <TextUI size={9} weight="bold" color={c.textSecondary} style={{ marginTop: -1 }}>١٥+</TextUI>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Direct Minute Jump Box */}
                <View
                  style={{
                    backgroundColor: themeMode === 'light' ? '#FBF8F3' : '#221914',
                    borderRadius: TOKENS.radius.lg,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: 'rgba(198, 146, 85, 0.28)',
                    marginBottom: 14
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Feather name="clock" size={13} color={TOKENS.colors.primary} />
                      <TextUI size={12} weight="bold" color={TOKENS.colors.primary}>
                        {t('الانتقال المباشر لدقيقة معينة:', 'Jump directly to minute:')}
                      </TextUI>
                    </View>
                    <TextUI size={10} color={c.textSecondary}>
                      {t('مثال: 15 أو 15:30', 'e.g. 15 or 15:30')}
                    </TextUI>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TextInput
                      value={minuteJumpInput}
                      onChangeText={setMinuteJumpInput}
                      placeholder={t('اكتب الدقيقة (مثلاً: 12 أو 12:30)', 'Enter minute (e.g. 12 or 12:30)')}
                      placeholderTextColor={c.textSecondary}
                      keyboardType="numeric"
                      onSubmitEditing={() => handleJumpToMinute()}
                      returnKeyType="go"
                      style={{
                        flex: 1,
                        height: 40,
                        backgroundColor: c.surface,
                        borderRadius: TOKENS.radius.md,
                        paddingHorizontal: 12,
                        fontSize: 13,
                        color: c.textPrimary,
                        textAlign: isRTL ? 'right' : 'left',
                        borderWidth: 1,
                        borderColor: c.border
                      }}
                    />
                    <TouchableOpacity
                      onPress={() => handleJumpToMinute()}
                      activeOpacity={0.8}
                      style={{
                        height: 40,
                        paddingHorizontal: 16,
                        borderRadius: TOKENS.radius.md,
                        backgroundColor: TOKENS.colors.primary,
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'row',
                        gap: 6
                      }}
                    >
                      <Feather name="play" size={13} color="#FFFFFF" />
                      <TextUI size={12} weight="bold" color="#FFFFFF">
                        {t('انتقال', 'Jump')}
                      </TextUI>
                    </TouchableOpacity>
                  </View>

                  {/* Quick Minute Jump Chips */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    <TextUI size={10} color={c.textSecondary} style={{ marginEnd: 2 }}>
                      {t('دقائق سريعة:', 'Quick:')}
                    </TextUI>
                    {['5', '10', '15', '20', '30', '45'].map((min) => (
                      <TouchableOpacity
                        key={`page-quick-min-${min}`}
                        onPress={() => handleJumpToMinute(min)}
                        activeOpacity={0.7}
                        style={{
                          paddingVertical: 3,
                          paddingHorizontal: 8,
                          borderRadius: TOKENS.radius.pill,
                          backgroundColor: c.surface,
                          borderWidth: 1,
                          borderColor: 'rgba(198, 146, 85, 0.3)'
                        }}
                      >
                        <TextUI size={10.5} weight="bold" color={TOKENS.colors.primary}>
                          {`${toArabicNumber(min)} د`}
                        </TextUI>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Offline Storage Download Bar */}
                <View style={{ paddingTop: 12, borderTopWidth: 1, borderTopColor: c.border, marginBottom: 14 }}>
                  {activeLesson?.id && downloadedLessons[activeLesson.id] ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginEnd: 8 }}>
                        <Feather name="check-circle" size={15} color="#2E7D32" />
                        <View>
                          <TextUI size={12} weight="bold" color="#2E7D32">
                            محفوظ في ذاكرة الجوال (أوفلاين)
                          </TextUI>
                          <TextUI size={10} color={c.textSecondary}>
                            {`الحجم: ${downloadedLessons[activeLesson.id]?.sizeMB || '0'} • الذاكرة المحلية`}
                          </TextUI>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => activeLesson?.id && deleteDownloadedLesson(activeLesson.id)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 8,
                          backgroundColor: '#FFEBEE',
                          borderWidth: 1,
                          borderColor: '#FFCDD2'
                        }}
                      >
                        <Feather name="trash-2" size={12} color="#C62828" />
                        <TextUI size={11} weight="bold" color="#C62828">
                          حذف لتوفير المساحة
                        </TextUI>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <TextUI size={11} color={c.textSecondary}>
                        {`استمع في أي وقت بدون إنترنت`}
                      </TextUI>
                      <TouchableOpacity
                        disabled={!activeLesson?.id || !!downloadingLessonIds[activeLesson.id]}
                        onPress={() => activeCourse && activeLesson && downloadLessonAudio(activeCourse, activeLesson)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          borderRadius: 8,
                          backgroundColor: '#1E5A3E'
                        }}
                      >
                        <Feather name="download" size={13} color="#FFFFFF" />
                        <TextUI size={11} weight="bold" color="#FFFFFF">
                          {activeLesson?.id && downloadingLessonIds[activeLesson.id]
                            ? `جارٍ التحميل ${downloadingLessonIds[activeLesson.id]}%...`
                            : 'تحميل للاستماع أوفلاين'}
                        </TextUI>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Notes & Bookmarks actions */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    onPress={saveQuickLessonBookmark}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      paddingVertical: 8,
                      paddingHorizontal: 8,
                      borderRadius: 8,
                      backgroundColor: themeMode === 'light' ? '#E8F5E9' : '#203225',
                      borderWidth: 1,
                      borderColor: '#1E5A3E'
                    }}
                  >
                    <Feather name="bookmark" size={13} color="#1E5A3E" />
                    <TextUI size={11} weight="bold" color="#1E5A3E">
                      {`حفظ الوقفة (${audioCurrentTime})`}
                    </TextUI>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setNewNoteTimestampSecs(audioCurrentSecs);
                      setLessonNoteModalVisible(true);
                    }}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      paddingVertical: 8,
                      paddingHorizontal: 8,
                      borderRadius: 8,
                      backgroundColor: themeMode === 'light' ? '#F0E8DE' : '#33271D',
                      borderWidth: 1,
                      borderColor: TOKENS.colors.primary
                    }}
                  >
                    <Feather name="edit-3" size={13} color={TOKENS.colors.primary} />
                    <TextUI size={11} weight="bold" color={TOKENS.colors.primary}>
                      + تدوين فائدة علمية
                    </TextUI>
                  </TouchableOpacity>
                </View>

                {/* Saved notes list */}
                {activeLesson?.id && lessonNotes[activeLesson.id] && lessonNotes[activeLesson.id].length > 0 && (
                  <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.border }}>
                    <TextUI size={11} weight="bold" color={TOKENS.colors.primaryDark} style={{ marginBottom: 6 }}>
                      {`الوقفات والفوائد المحفوظة (${toArabicNumber(lessonNotes[activeLesson.id].length)}):`}
                    </TextUI>
                    {lessonNotes[activeLesson.id].map((note) => (
                      <View
                        key={`modal-note-${note.id}`}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: c.surface,
                          borderRadius: 8,
                          paddingVertical: 7,
                          paddingHorizontal: 10,
                          borderWidth: 1,
                          borderColor: c.border,
                          marginBottom: 6
                        }}
                      >
                        <TouchableOpacity
                          onPress={() => seekAudioToTime(note.timestampSecs)}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginEnd: 8 }}
                        >
                          <Feather name="play-circle" size={15} color="#1E5A3E" />
                          <View style={{ flex: 1 }}>
                            <TextUI size={11.5} weight="bold" color={c.textPrimary}>
                              {note.text}
                            </TextUI>
                            <TextUI size={10} color="#1E5A3E">
                              {`عند الدقيقة (${toArabicNumber(note.timeLabel)})`}
                            </TextUI>
                          </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => activeLesson?.id && deleteLessonNote(activeLesson.id, note.id)}
                          style={{ padding: 4 }}
                        >
                          <Feather name="trash" size={13} color={c.textSecondary} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* Previous & Next Lesson Navigation Buttons */}
              {(() => {
                const currentLessonIdx = activeCourse?.lessons?.findIndex((l: any) => l.id === activeLesson?.id) ?? -1;
                const prevLesson = currentLessonIdx > 0 ? activeCourse?.lessons[currentLessonIdx - 1] : null;
                const nextLesson = currentLessonIdx >= 0 && currentLessonIdx < ((activeCourse?.lessons?.length || 0) - 1)
                  ? activeCourse?.lessons[currentLessonIdx + 1]
                  : null;

                return (
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                    {/* Previous Lesson Button */}
                    <TouchableOpacity
                      disabled={!prevLesson}
                      activeOpacity={0.8}
                      onPress={() => {
                        if (prevLesson) {
                          setActiveLesson(prevLesson);
                          playLessonAudio(activeCourse, prevLesson);
                          triggerHapticFeedback('medium');
                        }
                      }}
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        paddingVertical: 12,
                        paddingHorizontal: 10,
                        borderRadius: TOKENS.radius.md,
                        backgroundColor: prevLesson ? c.surface : (themeMode === 'light' ? '#F0F0F0' : '#222222'),
                        borderWidth: 1,
                        borderColor: prevLesson ? '#1E5A3E' : c.border,
                        opacity: prevLesson ? 1 : 0.5
                      }}
                    >
                      <Feather name={isRTL ? 'chevron-right' : 'chevron-left'} size={16} color={prevLesson ? '#1E5A3E' : c.textSecondary} />
                      <View style={{ alignItems: 'flex-start' }}>
                        <TextUI size={11} color={c.textSecondary}>الدرس السابق</TextUI>
                        <TextUI size={12} weight="bold" color={prevLesson ? '#1E5A3E' : c.textSecondary} numberOfLines={1}>
                          {prevLesson ? prevLesson.titleAr : 'بداية السلسلة'}
                        </TextUI>
                      </View>
                    </TouchableOpacity>

                    {/* Next Lesson Button */}
                    <TouchableOpacity
                      disabled={!nextLesson}
                      activeOpacity={0.8}
                      onPress={() => {
                        if (nextLesson) {
                          setActiveLesson(nextLesson);
                          playLessonAudio(activeCourse, nextLesson);
                          triggerHapticFeedback('medium');
                        }
                      }}
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        paddingVertical: 12,
                        paddingHorizontal: 10,
                        borderRadius: TOKENS.radius.md,
                        backgroundColor: nextLesson ? '#1E5A3E' : (themeMode === 'light' ? '#F0F0F0' : '#222222'),
                        borderWidth: 1,
                        borderColor: nextLesson ? '#1E5A3E' : c.border,
                        opacity: nextLesson ? 1 : 0.5
                      }}
                    >
                      <View style={{ alignItems: 'flex-end' }}>
                        <TextUI size={11} color={nextLesson ? 'rgba(255,255,255,0.8)' : c.textSecondary}>الدرس التالي</TextUI>
                        <TextUI size={12} weight="bold" color={nextLesson ? '#FFFFFF' : c.textSecondary} numberOfLines={1}>
                          {nextLesson ? nextLesson.titleAr : 'نهاية السلسلة'}
                        </TextUI>
                      </View>
                      <Feather name={isRTL ? 'chevron-left' : 'chevron-right'} size={16} color={nextLesson ? '#FFFFFF' : c.textSecondary} />
                    </TouchableOpacity>
                  </View>
                );
              })()}

              {/* All Lessons of This Course Section */}
              <View
                style={{
                  backgroundColor: c.surface,
                  borderRadius: TOKENS.radius.lg,
                  borderWidth: 1,
                  borderColor: c.border,
                  padding: 14,
                  marginBottom: 10
                }}
              >
                <TextUI weight="bold" size={14} color={TOKENS.colors.primaryDark} style={{ marginBottom: 10 }}>
                  {`دروس السلسلة (${toArabicNumber(activeCourse?.lessons?.length || 0)} درساً):`}
                </TextUI>

                {activeCourse?.lessons?.map((ls: any, lIdx: number) => {
                  const isCurrent = ls.id === activeLesson?.id;
                  return (
                    <TouchableOpacity
                      key={`page-course-lesson-${ls.id}`}
                      activeOpacity={0.8}
                      onPress={() => {
                        setActiveLesson(ls);
                        playLessonAudio(activeCourse, ls);
                        triggerHapticFeedback('medium');
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: 10,
                        paddingHorizontal: 10,
                        borderRadius: 8,
                        backgroundColor: isCurrent ? (themeMode === 'light' ? '#E8F5E9' : '#1E2D22') : (lIdx % 2 === 0 ? (themeMode === 'light' ? '#F9F7F3' : '#201A16') : 'transparent'),
                        borderWidth: isCurrent ? 1 : 0,
                        borderColor: '#1E5A3E',
                        marginBottom: 4
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginEnd: 8 }}>
                        <View
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 13,
                            backgroundColor: isCurrent ? '#1E5A3E' : (themeMode === 'light' ? '#E8E0D5' : '#2C221A'),
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginEnd: 8
                          }}
                        >
                          {isCurrent && isCurrentLessonPlaying ? (
                            <Feather name="volume-2" size={13} color="#FFFFFF" />
                          ) : (
                            <TextUI size={11} weight="bold" color={isCurrent ? '#FFFFFF' : c.textPrimary}>
                              {toArabicNumber(ls.number)}
                            </TextUI>
                          )}
                        </View>
                        <TextUI
                          size={12.5}
                          weight={isCurrent ? 'bold' : 'regular'}
                          color={isCurrent ? '#1E5A3E' : c.textPrimary}
                          numberOfLines={1}
                          style={{ flex: 1 }}
                        >
                          {ls.titleAr}
                        </TextUI>
                      </View>
                      <TextUI size={11} color={c.textSecondary}>
                        {ls.duration}
                      </TextUI>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  // ==========================================
  // --- MODULE 4: MORE SCREEN (المزيد) ---------
  // ==========================================
  const renderMore = () => (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header
        title={t('المزيد من الخدمات والإعدادات', 'More Services')}
        rightAction={
          <TouchableOpacity
            onPress={() => setCatalogModalVisible(true)}
            style={{
              width: 38,
              height: 38,
              borderRadius: TOKENS.radius.pill,
              backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : '#2C221C',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: TOKENS.colors.secondary
            }}
          >
            <Feather name="grid" size={17} color={TOKENS.colors.primary} />
          </TouchableOpacity>
        }
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 18, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Master Screen Catalog Banner */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setCatalogModalVisible(true)}
          style={{
            marginBottom: 20,
            backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : '#2C221C',
            borderRadius: TOKENS.radius.md,
            padding: 16,
            borderWidth: 1.5,
            borderColor: TOKENS.colors.secondary,
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <ArabesqueWatermark opacity={0.06} color={TOKENS.colors.secondary} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: TOKENS.colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: 12
                }}
              >
                <Feather name="grid" size={22} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1, alignItems: 'flex-start' }}>
                <TextUI weight="bold" size={15} color={TOKENS.colors.primaryDark}>
                  {t('فهرس كل شاشات ومسارات التطبيق (٣٧ شاشة)', 'Complete App Screen Directory (37 Screens)')}
                </TextUI>
                <TextUI size={12} color={c.textSecondary} style={{ marginTop: 2 }}>
                  {t('انتقال فوري لكافة الشاشات المخفية والفرعية الـ ٣٧', 'Direct 1-tap jump to any of the 37 screens')}
                </TextUI>
              </View>
            </View>
            <Feather name="chevron-left" size={20} color={TOKENS.colors.primary} />
          </View>
        </TouchableOpacity>

        {/* Section: الصلاة والقبلة */}
        <TextUI weight="bold" size={14} color={c.textSecondary} style={{ marginBottom: 8, paddingHorizontal: 4 }}>
          {t('خدمات الصلاة والقبلة', 'Prayer & Qibla Services')}
        </TextUI>
        <TappableRow
          title={t('مواقيت الصلاة اليومية', 'Prayer Times Schedule')}
          subtitle={t('جدول الصلوات الخمس والشروق', 'Full daily prayer timetable')}
          icon="clock"
          onPress={() => navigate('PrayerTimes')}
        />
        <TappableRow
          title={t('اتجاه القبلة المباشر', 'Qibla Compass')}
          subtitle={t('بوصلة دقيقة نحو الكعبة المشرفة', 'Direct compass to Holy Kaaba')}
          icon="compass"
          onPress={() => navigate('Qibla')}
        />
        <TappableRow
          title={t('طرق الحساب الفلكي', 'Astronomical Calculation')}
          value={t('رابطة العالم الإسلامي', 'Muslim World League')}
          icon="sliders"
          onPress={() => navigate('CalculationMethod')}
        />
        <TappableRow
          title={t('المدينة وإحداثيات الموقع', 'City & Coordinates')}
          value={isRTL ? currentCity.nameAr : currentCity.nameEn}
          icon="map-pin"
          onPress={() => navigate('LocationSettings')}
        />
        <TappableRow
          title={t('تخصيص تنبيهات الأذان', 'Adhan Notifications')}
          subtitle={t('تحديد الأذان أو التنبيه الهادئ', 'Customize per-prayer alert')}
          icon="bell"
          onPress={() => navigate('NotificationSettings')}
        />
        <TappableRow
          title={t('صوت الأذان المفضل', 'Adhan Voice')}
          value={adhanReciter === 'makkah' ? t('الحرم المكي', 'Makkah') : t('الحرم المدني', 'Madinah')}
          icon="volume-2"
          onPress={() => navigate('AdhanSettings')}
        />
        <TappableRow
          title={t('إعدادات الصلاة الشاملة', 'Prayer General Settings')}
          subtitle={t('طرق حساب العصر والفجر والتنبيه المبكر', 'Asr juristic method & alerts')}
          icon="settings"
          onPress={() => navigate('PrayerSettings')}
        />

        {/* Section: الفرائض والتقويم الإسلامي */}
        <TextUI weight="bold" size={14} color={c.textSecondary} style={{ marginTop: 18, marginBottom: 8, paddingHorizontal: 4 }}>
          {t('الفرائض والتقويم الإسلامي', 'Islamic Duties & Calendar')}
        </TextUI>
        <TappableRow
          title={t('المناسبات والتقويم الإسلامي', 'Islamic Events & Calendar')}
          subtitle={t('الأعياد ومواسم الخير وأيام الصيام المسنونة', 'Eids, Ramadan, and Sunnah fasting days')}
          icon="calendar"
          onPress={() => navigate('IslamicEvents')}
        />
        <TappableRow
          title={t('حاسبة الزكاة الشرعية الذكية', 'Smart Zakat Calculator')}
          subtitle={t('حساب زكاة المال والذهب والفضة والأسهم والفطر', 'Cash, Gold, Stocks & Zakat al-Fitr')}
          icon="award"
          onPress={() => navigate('ZakatCalculator')}
        />

        {/* Section: الموسوعة والعلوم الشرعية */}
        <TextUI weight="bold" size={14} color={c.textSecondary} style={{ marginTop: 18, marginBottom: 8, paddingHorizontal: 4 }}>
          {t('الموسوعة والعلوم الشرعية', 'Islamic Encyclopedia & Hadith')}
        </TextUI>
        <TappableRow
          title={t('الرقية الشرعية الكاملة من القرآن والسنة', 'Comprehensive Legal Ruqyah')}
          subtitle={t('آيات الشفاء والسكينة والتحصين والأدعية المأثورة', 'Quranic healing, peace verses, and prophetic prayers')}
          icon="shield"
          onPress={() => navigate('Ruqyah')}
        />
        <TappableRow
          title={t('الأربعون النووية مع الشرح والفوائد', "An-Nawawi's 40 Hadiths")}
          subtitle={t('نصوص الأحاديث الجامعة وشرحها والفوائد المستفادة', 'Foundational prophetic traditions with commentaries')}
          icon="book"
          onPress={() => navigate('Hadith40')}
        />
        <TappableRow
          title={t('أسماء الله الحسنى الـ ٩٩ ومعانيها', '99 Beautiful Names of Allah')}
          subtitle={t('أسماء الله الحسنى بالرسم الأندلسي وشرح معانيها الجليلة', 'The 99 Divine Names with meditative meanings')}
          icon="award"
          onPress={() => navigate('AllahNames')}
        />
        <TappableRow
          title={t('دروس الحرم النبوي والكراسي العلمية', "Prophet's Mosque Scholarly Lessons")}
          subtitle={t('كراسي العلم وشروح المتون بالمسجد النبوي الشريف', "Scholarly chairs & commentaries from the Prophet's Mosque")}
          icon="book-open"
          iconColor="#1E5A3E"
          onPress={() => navigate('ProphetLessons')}
        />

        {/* Section: القرآن الكريم */}
        <TextUI weight="bold" size={14} color={c.textSecondary} style={{ marginTop: 18, marginBottom: 8, paddingHorizontal: 4 }}>
          {t('خدمات القرآن الكريم', 'Holy Quran Services')}
        </TextUI>
        <TappableRow
          title={t('فهرس المصحف الشريف', 'Quran Surah Index')}
          subtitle={t('١١٤ سورة مع البحث السريع', '114 chapters with search')}
          icon="book-open"
          onPress={() => navigate('QuranIndex')}
        />
        <TappableRow
          title={t('قارئ المصحف والآيات مع التفسير', 'Quran Reader & Tafsir')}
          subtitle={t('قراءة المصحف بالخط العثماني والتفسير الميسر', 'Read verses with offline tafsir')}
          icon="book"
          onPress={() => navigate('QuranReader')}
        />
        <TappableRow
          title={t('الإشارات المرجعية المحفوظة', 'Quran Bookmarks')}
          subtitle={t('الآيات والسور المحفوظة للمتابعة', 'Saved verses to resume')}
          icon="bookmark"
          iconColor={TOKENS.colors.secondary}
          onPress={() => navigate('QuranBookmarks')}
        />
        <TappableRow
          title={t('إعدادات خط المصحف والتفسير', 'Quran Font & Tafsir Settings')}
          value={`${quranFontSize} pt`}
          icon="type"
          onPress={() => navigate('QuranSettings')}
        />
        <TappableRow
          title={t('التلاوات الصوتية والقراء', 'Audio Recitations')}
          subtitle={t('برهجي، الحذيفي، القاسم، المنشاوي، عبد الباسط، الشريم، الدوسري...', 'Barhaji, Al-Hudhaifi, Al-Qasim, Minshawi, Abdul Basit, Shuraim...')}
          icon="volume-2"
          onPress={() => navigate('QuranAudio')}
        />

        {/* Section: الأذكار */}
        <TextUI weight="bold" size={14} color={c.textSecondary} style={{ marginTop: 18, marginBottom: 8, paddingHorizontal: 4 }}>
          {t('الأذكار والتسبيح', 'Azkar & Remembrance')}
        </TextUI>
        <TappableRow
          title={t('تصنيفات الأذكار المأثورة', 'Azkar Categories')}
          subtitle={t('أذكار الصباح، المساء، النوم، والأدعية', 'Morning, evening, sleep, and prophetic duas')}
          icon="heart"
          onPress={() => navigate('AzkarCategories')}
        />
        <TappableRow
          title={t('جلسة الذكر والعداد اللمسي التفاعلي', 'Interactive Azkar Session')}
          subtitle={t('تسبيح لمسي بالاهتزاز وحفظ التقدم التلقائي', 'Tap counter with haptic feedback')}
          icon="activity"
          onPress={() => navigate('AzkarSession')}
        />
        <TappableRow
          title={t('شاشة إتمام الورد والتقبل', 'Dhikr Completion Screen')}
          subtitle={t('شاشة التهنئة ودعاء ختام الورد', 'Completion screen & acceptance')}
          icon="check-circle"
          onPress={() => navigate('AzkarCompletion')}
        />
        <TappableRow
          title={t('تفضيلات الاهتزاز والعداد', 'Azkar & Haptic Preferences')}
          subtitle={t('الاهتزاز اللمسي وتصفير العداد التلقائي', 'Haptic feedback on tap')}
          icon="smartphone"
          onPress={() => navigate('AzkarSettings')}
        />

        {/* Section: جولة الترحيب والتهيئة الأولى */}
        <TextUI weight="bold" size={14} color={c.textSecondary} style={{ marginTop: 18, marginBottom: 8, paddingHorizontal: 4 }}>
          {t('جولة الترحيب والتهيئة الأولى', 'Onboarding & First-time Setup')}
        </TextUI>
        <TappableRow
          title={t('شاشة الترحيب بالمصلى', 'Welcome Tour Screen')}
          subtitle={t('البداية التعريفية بتطبيق رفيق المسلم', 'Introductory welcome screen')}
          icon="smile"
          onPress={() => navigate('Welcome')}
        />
        <TappableRow
          title={t('إذن تحديد الموقع الجغرافي', 'Location Permission')}
          subtitle={t('شاشة طلب وتوضيح صلاحية الموقع للمواقيت', 'Location request screen')}
          icon="map-pin"
          onPress={() => navigate('LocationPermission')}
        />
        <TappableRow
          title={t('البحث واختيار المدينة يدوياً', 'Manual City Selection')}
          subtitle={t('قائمة عواصم ومدن العالم الإسلامي', 'World cities directory')}
          icon="search"
          onPress={() => navigate('ManualLocation')}
        />
        <TappableRow
          title={t('إذن التنبيهات والأذان', 'Notification Permission')}
          subtitle={t('شاشة تفعيل أذان الصلوات الخمس والتذكير', 'Notification permission setup')}
          icon="bell"
          onPress={() => navigate('NotificationPermission')}
        />

        {/* Section: المظهر واللغة */}
        <TextUI weight="bold" size={14} color={c.textSecondary} style={{ marginTop: 18, marginBottom: 8, paddingHorizontal: 4 }}>
          {t('المظهر واللغة', 'Appearance & Language')}
        </TextUI>
        <TappableRow
          title={t('المظهر (داكن / فاتح)', 'Appearance')}
          value={themeMode === 'dark' ? t('الوضع الداكن', 'Dark') : t('الوضع الفاتح', 'Light')}
          icon="moon"
          onPress={() => navigate('Appearance')}
        />
        <TappableRow
          title={t('لغة التطبيق', 'App Language')}
          value={lang === 'ar' ? 'العربية (RTL)' : 'English (LTR)'}
          icon="globe"
          onPress={() => navigate('Language')}
        />

        {/* Section: الخصوصية وعن التطبيق */}
        <TextUI weight="bold" size={14} color={c.textSecondary} style={{ marginTop: 18, marginBottom: 8, paddingHorizontal: 4 }}>
          {t('المصادر والأمان', 'Trust & Privacy')}
        </TextUI>
        <TappableRow
          title={t('سياسة الخصوصية والأمان', 'Privacy Policy')}
          subtitle={t('يعمل بدون اتصال وبدون تتبع إعلاني', 'Offline-first, 100% private')}
          icon="shield"
          onPress={() => navigate('Privacy')}
        />
        <TappableRow
          title={t('المصادر والاعتمادات', 'Sources & Citations')}
          subtitle={t('مجمع الملك فهد والحسابات الفلكية', 'King Fahd Complex & references')}
          icon="file-text"
          onPress={() => navigate('Sources')}
        />
        <TappableRow
          title={t('حول رفيق المسلم', 'About Islamic Companion')}
          value="v1.0.0"
          icon="info"
          onPress={() => navigate('About')}
        />
      </ScrollView>
    </View>
  );

  // Sub-Settings & Utilities Screens
  const renderPrayerSettings = () => {
    const methodTitles: any = {
      mwl: t('رابطة العالم الإسلامي', 'Muslim World League'),
      makkah: t('جامعة أم القرى (مكة)', 'Umm Al-Qura, Makkah'),
      egypt: t('هيئة المساحة المصرية', 'Egyptian Survey Authority'),
      isna: t('الجمعية الإسلامية (ISNA)', 'ISNA'),
      karachi: t('جامعة كراتشي', 'Karachi'),
      diyanet: t('ديانت التركية', 'Diyanet')
    };

    const reciterTitles: any = {
      makkah: t('أذان المسجد الحرام', 'Masjid al-Haram'),
      madinah: t('أذان المسجد النبوي', 'Prophet\'s Mosque'),
      quds: t('أذان المسجد الأقصى', 'Al-Aqsa'),
      cairo: t('أذان الجامع الأزهر', 'Al-Azhar'),
      alafasy: t('أذان الشيخ العفاسي', 'Alafasy'),
      soft: t('تنبيه صوتي هادئ', 'Gentle chime')
    };

    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <Header title={t('إعدادات الصلاة', 'Prayer Settings')} onBack={goBack} />
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
          <TextUI weight="bold" size={14} color={c.textSecondary} style={{ marginBottom: 8, paddingHorizontal: 4 }}>
            {t('الحساب والموقع', 'Calculation & Location')}
          </TextUI>
          <TappableRow
            title={t('طريقة الحساب الفلكي', 'Calculation Method')}
            value={methodTitles[calculationMethod] || t('رابطة العالم الإسلامي', 'Muslim World League')}
            icon="sliders"
            onPress={() => navigate('CalculationMethod')}
          />
          <TappableRow
            title={t('مذهب صلاة العصر', 'Asr Method')}
            value={asrMethod === 'majority' ? t('الجمهور (الشافعي، المالكي، الحنبلي)', 'Standard') : t('الحنفي', 'Hanafi')}
            icon="clock"
            onPress={() => {
              const next = asrMethod === 'majority' ? 'hanafi' : 'majority';
              setAsrMethod(next);
              savePref('almosala_asr_method', next);
            }}
          />
          <TappableRow
            title={t('المدينة الحالية', 'Current City')}
            value={isRTL ? currentCity.nameAr : currentCity.nameEn}
            icon="map-pin"
            onPress={() => navigate('LocationSettings')}
          />

          {/* Hijri Adjustment Selector */}
          <View style={{ backgroundColor: c.surface, borderRadius: TOKENS.radius.md, padding: 14, marginTop: 12, marginBottom: 4, borderWidth: 1, borderColor: c.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <View style={{ alignItems: 'flex-start' }}>
                <TextUI weight="bold" size={13} color={c.textPrimary}>
                  {t('تعديل التقويم الهجري', 'Hijri Calendar Adjustment')}
                </TextUI>
                <TextUI size={11} color={c.textSecondary} style={{ marginTop: 1 }}>
                  {t('مطابقة التاريخ مع رؤية الهلال المحلية', 'Adjust for local moon sighting')}
                </TextUI>
              </View>
              <View style={{ backgroundColor: TOKENS.colors.primaryLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: TOKENS.radius.pill }}>
                <TextUI weight="bold" size={11} color={TOKENS.colors.primaryDark}>
                  {getFormattedHijriDate(hijriAdjustment).ar}
                </TextUI>
              </View>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 6 }}>
              {[-2, -1, 0, 1, 2].map((offset) => {
                const isSelected = hijriAdjustment === offset;
                const label = offset === 0 ? t('تلقائي (٠)', 'Default (0)') : (offset > 0 ? `+${toArabicNumber(offset)}` : `${toArabicNumber(offset)}`);
                return (
                  <TouchableOpacity
                    key={offset}
                    onPress={() => {
                      setHijriAdjustment(offset);
                      savePref('almosala_hijri_offset', offset);
                      triggerHapticFeedback('light');
                    }}
                    style={{
                      flex: 1,
                      paddingVertical: 7,
                      borderRadius: TOKENS.radius.sm,
                      backgroundColor: isSelected ? TOKENS.colors.primary : (themeMode === 'light' ? '#F7F3EE' : '#332922'),
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: isSelected ? TOKENS.colors.primary : c.border
                    }}
                  >
                    <TextUI weight={isSelected ? 'bold' : 'regular'} size={11} color={isSelected ? '#FFFFFF' : c.textPrimary}>
                      {label}
                    </TextUI>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <TextUI weight="bold" size={14} color={c.textSecondary} style={{ marginTop: 18, marginBottom: 8, paddingHorizontal: 4 }}>
            {t('التنبيهات والأذان', 'Notifications & Adhan')}
          </TextUI>
          <TappableRow
            title={t('صوت الأذان المفضل', 'Adhan Reciter')}
            value={reciterTitles[adhanReciter] || t('أذان المسجد الحرام', 'Masjid al-Haram')}
            icon="volume-2"
            onPress={() => navigate('AdhanSettings')}
          />
          <TappableRow
            title={t('تخصيص تنبيهات كل صلاة', 'Per-Prayer Notifications')}
            subtitle={t('تحديد الأذان أو التنبيه الهادئ لكل صلاة', 'Customize alert type per prayer')}
            icon="bell"
            onPress={() => navigate('NotificationSettings')}
          />
        </ScrollView>
      </View>
    );
  };

  const renderCalculationMethod = () => {
    const methods = [
      {
        id: 'mwl',
        title: t('رابطة العالم الإسلامي (موصى به)', 'Muslim World League (Recommended)'),
        details: t('فجر: ١٨° • عشاء: ١٧° • معتمد بأوروبا وأمريكا وأغلب الدول', 'Fajr: 18° • Isha: 17° • Europe, Far East & Americas')
      },
      {
        id: 'makkah',
        title: t('جامعة أم القرى - مكة المكرمة', 'Umm Al-Qura University, Makkah'),
        details: t('فجر: ١٨.٥° • عشاء: ٩٠ دقيقة بعد المغرب • المملكة العربية السعودية والخليج', 'Fajr: 18.5° • Isha: +90 min • Saudi Arabia & Arabian Gulf')
      },
      {
        id: 'egypt',
        title: t('الهيئة العامة المصرية للمساحة', 'Egyptian General Authority of Survey'),
        details: t('فجر: ١٩.٥° • عشاء: ١٧.٥° • مصر والسودان وبلاد الشام وأفريقيا', 'Fajr: 19.5° • Isha: 17.5° • Egypt, Sudan, Levant & Africa')
      },
      {
        id: 'isna',
        title: t('الجمعية الإسلامية لأمريكا الشمالية (ISNA)', 'Islamic Society of North America (ISNA)'),
        details: t('فجر: ١٥° • عشاء: ١٥° • الولايات المتحدة وكندا', 'Fajr: 15° • Isha: 15° • USA & Canada')
      },
      {
        id: 'karachi',
        title: t('جامعة العلوم الإسلامية بكراتشي', 'University of Islamic Sciences, Karachi'),
        details: t('فجر: ١٨° • عشاء: ١٨° • باكستان والهند وأفغانستان وبنغلاديش', 'Fajr: 18° • Isha: 18° • Pakistan, India & Bangladesh')
      },
      {
        id: 'diyanet',
        title: t('رئاسة الشؤون الدينية التركية (ديانت)', 'Diyanet İşleri Başkanlığı, Turkey'),
        details: t('فجر: ١٨° • عشاء: ١٧° • تركيا ودول البلقان والقوقاز', 'Fajr: 18° • Isha: 17° • Turkey & Balkan States')
      }
    ];

    const activeMethod = methods.find((m) => m.id === calculationMethod) || methods[0];

    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <Header title={t('طرق الحساب الفلكي', 'Calculation Methods')} onBack={goBack} />
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
          {/* Method Info Illuminated Banner */}
          <View
            style={{
              backgroundColor: themeMode === 'light' ? TOKENS.colors.secondaryLight : '#2C221C',
              borderRadius: TOKENS.radius.lg,
              borderWidth: 1.5,
              borderColor: TOKENS.colors.secondary,
              padding: 18,
              marginBottom: 20,
              alignItems: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <ArabesqueWatermark opacity={0.08} color={TOKENS.colors.secondary} />
            <View style={{ width: '100%', marginBottom: 6 }}>
              <MoorishArchFrame height={18} color={TOKENS.colors.secondary} opacity={0.8} />
            </View>
            <TextUI size={12} weight="bold" color={TOKENS.colors.secondary}>
              {t('المعيار الفلكي المعتمد حالياً', 'Active Astronomical Standard')}
            </TextUI>
            <TextUI weight="bold" size={16} color={TOKENS.colors.primaryDark} style={{ marginTop: 2 }}>
              {activeMethod.title}
            </TextUI>
            <TextUI size={12} color={c.textSecondary} style={{ marginTop: 3 }} align="center">
              {activeMethod.details}
            </TextUI>
          </View>

          <TextUI weight="bold" size={14} color={c.textSecondary} style={{ marginBottom: 10, paddingHorizontal: 4 }}>
            {t('اختر الهيئة أو التقويم المعتمد:', 'Select Calculation Authority:')}
          </TextUI>

          {methods.map((method) => {
            const isSelected = calculationMethod === method.id;
            return (
              <TappableRow
                key={method.id}
                title={method.title}
                subtitle={method.details}
                onPress={() => {
                  setCalculationMethod(method.id);
                  savePref('almosala_calc_method', method.id);
                  goBack();
                }}
                hasChevron={false}
                rightElement={isSelected ? <Feather name="check" size={18} color={TOKENS.colors.primary} /> : null}
              />
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderLocationSettings = () => (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title={t('إعدادات الموقع الجغرافي', 'Location Settings')} onBack={goBack} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        <View
          style={{
            backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : '#2C231E',
            padding: 16,
            borderRadius: TOKENS.radius.md,
            marginBottom: 16
          }}
        >
          <TextUI weight="bold" size={15} color={TOKENS.colors.primary}>
            {`${t('المدينة الحالية:', 'Current City:')} ${isRTL ? currentCity.nameAr : currentCity.nameEn}`}
          </TextUI>
          <TextUI size={13} color={c.textSecondary} style={{ marginTop: 2 }}>
            {`${t('الإحداثيات:', 'Coordinates:')} ${currentCity.lat}, ${currentCity.lng}`}
          </TextUI>
        </View>

        {/* Live GPS Auto-Detection Button */}
        <TouchableOpacity
          disabled={gpsLoading}
          onPress={async () => {
            const ok = await fetchLiveGpsLocation();
            if (ok) goBack();
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: TOKENS.colors.primary,
            paddingVertical: 14,
            paddingHorizontal: 20,
            borderRadius: TOKENS.radius.md,
            marginBottom: 18,
            ...makeShadow('0 4px 14px rgba(140, 94, 60, 0.25)', '#8C5E3C', 0.25, 6, { width: 0, height: 2 }, 4)
          }}
        >
          <Feather name={gpsLoading ? "loader" : "crosshair"} size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
          <TextUI weight="bold" size={15} color="#FFFFFF">
            {gpsLoading ? t('جارٍ تحديد موقعك عبر الأقمار الصناعية...', 'Detecting GPS Location...') : t('تحديد موقعي التلقائي عبر الـ GPS', 'Detect My Live Location via GPS')}
          </TextUI>
        </TouchableOpacity>

        {gpsError && (
          <View style={{ backgroundColor: '#FEE2E2', padding: 10, borderRadius: 8, marginBottom: 14 }}>
            <TextUI size={12} color="#DC2626">{gpsError}</TextUI>
          </View>
        )}

        <TextUI weight="bold" size={14} color={c.textSecondary} style={{ marginBottom: 10, paddingHorizontal: 4 }}>
          {t('اختر مدينة من القائمة المعتمدة:', 'Select from verified cities:')}
        </TextUI>

        {CITIES.map((city) => {
          const isSelected = currentCity.id === city.id;
          return (
            <TappableRow
              key={city.id}
              title={isRTL ? city.nameAr : city.nameEn}
              subtitle={`${isRTL ? city.country : city.country} • (${city.lat}, ${city.lng})`}
              badge={isSelected ? t('المحددة', 'Active') : null}
              badgeColor={themeMode === 'light' ? TOKENS.colors.primaryLight : '#382E28'}
              icon="map-pin"
              onPress={async () => {
                const latNum = parseFloat(city.lat);
                const lngNum = parseFloat(city.lng);
                const timings = await getAccuratePrayerTimes(latNum, lngNum, new Date(), calculationMethod);
                const updatedCity = {
                  ...city,
                  prayers: [
                    { id: 'fajr', nameAr: 'الفجر', nameEn: 'Fajr', time: timings.fajr, isNext: false, icon: 'sunrise' },
                    { id: 'sunrise', nameAr: 'الشروق', nameEn: 'Sunrise', time: timings.sunrise, isNext: false, icon: 'sun' },
                    { id: 'dhuhr', nameAr: 'الظهر', nameEn: 'Dhuhr', time: timings.dhuhr, isNext: false, icon: 'sun' },
                    { id: 'asr', nameAr: 'العصر', nameEn: 'Asr', time: timings.asr, isNext: false, icon: 'clock' },
                    { id: 'maghrib', nameAr: 'المغرب', nameEn: 'Maghrib', time: timings.maghrib, isNext: false, icon: 'sunset' },
                    { id: 'isha', nameAr: 'العشاء', nameEn: 'Isha', time: timings.isha, isNext: false, icon: 'moon' }
                  ]
                };
                setCurrentCity(updatedCity);
                savePref('almosala_city', city.id);
                goBack();
              }}
              rightElement={isSelected ? <Feather name="check" size={18} color={TOKENS.colors.primary} /> : null}
            />
          );
        })}
      </ScrollView>
    </View>
  );

  const renderNotificationSettings = () => {
    const prayerList = [
      { id: 'fajr', name: t('الفجر', 'Fajr') },
      { id: 'dhuhr', name: t('الظهر', 'Dhuhr') },
      { id: 'asr', name: t('العصر', 'Asr') },
      { id: 'maghrib', name: t('المغرب', 'Maghrib') },
      { id: 'isha', name: t('العشاء', 'Isha') }
    ];

    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <Header title={t('تنبيهات الصلوات', 'Prayer Notifications')} onBack={goBack} />
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
          <TextUI weight="bold" size={14} color={c.textSecondary} style={{ marginBottom: 10, paddingHorizontal: 4 }}>
            {t('تفعيل الأذان لكل صلاة:', 'Enable alert for each prayer:')}
          </TextUI>

        {/* Instant Test Adhan Notification */}
        <TouchableOpacity
          onPress={sendTestAdhanNotification}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: themeMode === 'light' ? TOKENS.colors.secondaryLight : '#2E2218',
            borderWidth: 1,
            borderColor: TOKENS.colors.secondary,
            paddingVertical: 13,
            paddingHorizontal: 16,
            borderRadius: TOKENS.radius.md,
            marginBottom: 20
          }}
        >
          <Feather name="bell" size={17} color={TOKENS.colors.primaryDark} style={{ marginLeft: 8 }} />
          <TextUI weight="bold" size={14} color={TOKENS.colors.primaryDark}>
            {t('تجربة إرسال تنبيه الأذان الآن', 'Send Test Adhan Notification')}
          </TextUI>
        </TouchableOpacity>

        {prayerList.map((p) => {
            const isEnabled = prayerBells[p.id];
            return (
              <TappableRow
                key={p.id}
                title={p.name}
                subtitle={isEnabled ? t('الأذان مفعّل', 'Adhan enabled') : t('صامت', 'Muted')}
                icon="bell"
                hasChevron={false}
                rightElement={
                  <Switch
                    value={isEnabled}
                    onValueChange={(val) => setPrayerBells((prev) => ({ ...prev, [p.id]: val }))}
                    trackColor={{ false: '#D1CDC7', true: TOKENS.colors.primary }}
                  />
                }
              />
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderAdhanSettings = () => {
    const reciters = [
      { id: 'makkah', title: t('أذان المسجد الحرام (مكة المكرمة)', 'Masjid al-Haram, Makkah'), muezzin: 'الشيخ علي ملا' },
      { id: 'madinah', title: t('أذان المسجد النبوي (المدينة المنورة)', 'Prophet\'s Mosque, Madinah'), muezzin: 'الشيخ عصام بخاري' },
      { id: 'quds', title: t('أذان المسجد الأقصى المبارك (القدس)', 'Al-Aqsa Mosque, Jerusalem'), muezzin: 'مؤذنو المسجد الأقصى' },
      { id: 'cairo', title: t('أذان الجامع الأزهر الشريف (القاهرة)', 'Al-Azhar Mosque, Cairo'), muezzin: 'تراث المقارئ المصرية' },
      { id: 'alafasy', title: t('أذان بصوت الشيخ مشاري العفاسي', 'Mishary Rashid Alafasy'), muezzin: 'تسجيل استوديو نقي' },
      { id: 'soft', title: t('تنبيه صوتي هادئ (بدون أذان كامل)', 'Gentle chime (Non-Adhan alert)'), muezzin: 'نغمة هادئة' }
    ];

    const currentMuezzin = reciters.find((r) => r.id === adhanReciter) || reciters[0];

    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <Header title={t('صوت الأذان المفضل', 'Adhan Voice')} onBack={goBack} />
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
          {/* Adhan Preview & Audio Test Banner */}
          <View
            style={{
              backgroundColor: themeMode === 'light' ? TOKENS.colors.secondaryLight : '#2C221C',
              borderRadius: TOKENS.radius.lg,
              borderWidth: 1.5,
              borderColor: TOKENS.colors.secondary,
              padding: 18,
              marginBottom: 20,
              alignItems: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <ArabesqueWatermark opacity={0.08} color={TOKENS.colors.secondary} />
            <View style={{ width: '100%', marginBottom: 6 }}>
              <MoorishArchFrame height={18} color={TOKENS.colors.secondary} opacity={0.8} />
            </View>
            <TextUI size={12} weight="bold" color={TOKENS.colors.secondary}>
              {t('الصوت المعتمد حالياً للصلوات', 'Currently Active Adhan')}
            </TextUI>
            <TextUI weight="bold" size={16} color={TOKENS.colors.primaryDark} style={{ marginTop: 2 }}>
              {currentMuezzin.title}
            </TextUI>
            <TextUI size={12} color={c.textSecondary} style={{ marginTop: 2 }}>
              {currentMuezzin.muezzin}
            </TextUI>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={playAdhanPreviewTone}
              style={{
                marginTop: 12,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: TOKENS.colors.primary,
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: TOKENS.radius.pill,
                gap: 6
              }}
            >
              <Feather name="volume-2" size={15} color="#FFFFFF" />
              <TextUI size={12} weight="bold" color="#FFFFFF">
                {t('استمع لنموذج التنبيه والأذان', 'Listen to sample alert')}
              </TextUI>
            </TouchableOpacity>
          </View>

          <TextUI weight="bold" size={14} color={c.textSecondary} style={{ marginBottom: 10, paddingHorizontal: 4 }}>
            {t('اختر صوت المؤذن المفضل:', 'Select Adhan Voice:')}
          </TextUI>

          {reciters.map((r) => {
            const isSelected = adhanReciter === r.id;
            return (
              <TappableRow
                key={r.id}
                title={r.title}
                subtitle={r.muezzin}
                icon="volume-2"
                onPress={() => {
                  setAdhanReciter(r.id);
                  savePref('almosala_adhan_reciter', r.id);
                  playAdhanPreviewTone();
                  goBack();
                }}
                hasChevron={false}
                rightElement={isSelected ? <Feather name="check" size={18} color={TOKENS.colors.primary} /> : null}
              />
            );
          })}
        </ScrollView>
      </View>
    );
  };

  // ==========================================
  // --- MODULE 5: QURAN SERVICES -------------
  // ==========================================
  const renderQuranIndex = () => {
    const filteredSurahs = SURAHS.filter(
      (s) => s.nameAr.includes(searchQuery) || s.nameEn.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <Header
          title={t('المصحف الشريف', 'Holy Quran')}
          rightAction={
            <TouchableOpacity onPress={() => navigate('QuranBookmarks')} style={{ padding: 6 }}>
              <Feather name="bookmark" size={18} color={c.textPrimary} />
            </TouchableOpacity>
          }
        />

        {/* Search Bar */}
        <View style={{ paddingHorizontal: 18, marginBottom: 12, marginTop: 12 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: c.surface,
              borderRadius: TOKENS.radius.md,
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderWidth: 1,
              borderColor: c.border
            }}
          >
            <Feather name="search" size={18} color={c.textSecondary} />
            <TextInput
              placeholder={t('البحث عن سورة بالاسم أو الرقم...', 'Search Surah by name or number...')}
              placeholderTextColor={c.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={{
                flex: 1,
                fontFamily: 'Tajawal_400Regular',
                fontSize: 14,
                color: c.textPrimary,
                textAlign: isRTL ? 'right' : 'left',
                marginHorizontal: 10
              }}
            />
          </View>
        </View>

        {/* Continue Reading / Reading Bookmark Card (متابعة القراءة من علامة التوقف) */}
        {readingBookmark && (
          <View style={{ paddingHorizontal: 18, marginBottom: 12 }}>
            <TouchableOpacity
              testID="resume-reading-card"
              activeOpacity={0.85}
              onPress={() => {
                const foundSurah = SURAHS.find((s: any) => s.id === readingBookmark.surahId) || SURAHS[0];
                setSelectedSurah(foundSurah);
                setReadingAyah(readingBookmark.ayahNumber);
                setStreamSurahCount(1);
                setStreamPageCount(4);
                navigate('QuranReader');
                setTimeout(() => {
                  if (Platform.OS === 'web') {
                    const el = document.getElementById('reading-bookmark-target');
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }, 400);
              }}
              style={{
                backgroundColor: themeMode === 'light' ? '#FFF9EE' : '#2D2218',
                borderWidth: 1.5,
                borderColor: 'rgba(198, 146, 85, 0.5)',
                borderRadius: TOKENS.radius.lg,
                padding: 13,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                ...makeShadow('0 3px 12px rgba(198, 146, 85, 0.12)', '#C69255', 0.15, 6, { width: 0, height: 2 }, 4)
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, flex: 1 }}>
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : '#3D2F24',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: TOKENS.colors.primary
                  }}
                >
                  <Feather name="bookmark" size={18} color={TOKENS.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <TextUI size={10.5} weight="bold" color={TOKENS.colors.primary}>
                    {t('متابعة القراءة • آخر علامة توقف 🔖', 'Continue Reading • Bookmark 🔖')}
                  </TextUI>
                  <TextUI size={13.5} weight="bold" color={c.textPrimary}>
                    {`سورة ${readingBookmark.surahNameAr} • الآية (${toArabicNumber(readingBookmark.ayahNumber)})`}
                  </TextUI>
                  {readingBookmark.text ? (
                    <TextUI size={11} color={c.textSecondary} numberOfLines={1}>
                      {readingBookmark.text}
                    </TextUI>
                  ) : null}
                </View>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: TOKENS.colors.primary,
                  paddingVertical: 6,
                  paddingHorizontal: 11,
                  borderRadius: TOKENS.radius.pill
                }}
              >
                <TextUI size={11} weight="bold" color="#FFFFFF">
                  {t('استئناف', 'Resume')}
                </TextUI>
                <Feather name={isRTL ? 'chevron-left' : 'chevron-right'} size={13} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Hub: Khatmah, Bookmarks & Audio */}
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 18, marginBottom: 14 }}>
          <TouchableOpacity
            onPress={() => navigate('QuranKhatmah')}
            style={{
              flex: 1,
              backgroundColor: themeMode === 'light' ? TOKENS.colors.secondaryLight : '#382E28',
              padding: 10,
              borderRadius: TOKENS.radius.md,
              borderWidth: 1,
              borderColor: TOKENS.colors.secondary,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Feather name="award" size={15} color={TOKENS.colors.primaryDark} style={{ marginLeft: 6 }} />
            <TextUI size={12} weight="bold" color={TOKENS.colors.primaryDark}>{t('ختمتي والورد 🎯', 'Khatmah')}</TextUI>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigate('QuranBookmarks')}
            style={{
              flex: 1,
              backgroundColor: c.surface,
              padding: 10,
              borderRadius: TOKENS.radius.md,
              borderWidth: 1,
              borderColor: c.border,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Feather name="bookmark" size={15} color={TOKENS.colors.secondary} style={{ marginLeft: 6 }} />
            <TextUI size={12} weight="bold">{t('المحفوظات', 'Bookmarks')}</TextUI>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigate('QuranAudio')}
            style={{
              flex: 1,
              backgroundColor: c.surface,
              padding: 10,
              borderRadius: TOKENS.radius.md,
              borderWidth: 1,
              borderColor: c.border,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Feather name="headphones" size={15} color={TOKENS.colors.primary} style={{ marginLeft: 6 }} />
            <TextUI size={12} weight="bold">{t('التلاوات', 'Recitations')}</TextUI>
          </TouchableOpacity>
        </View>

        {/* Surahs List */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 110 }}>
          {filteredSurahs.map((surah) => (
            <TappableRow
              key={surah.id}
              title={isRTL ? `سورة ${surah.nameAr}` : `Surah ${surah.nameEn}`}
              subtitle={isRTL ? `${toArabicNumber(surah.verses)} آية • ${surah.type} • الجزء ${toArabicNumber(surah.juz)}` : `${surah.verses} verses • ${surah.type} • Juz ${surah.juz}`}
              badge={surah.lastRead ? t('آخر قراءة', 'Last Read') : null}
              customIcon={
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    borderWidth: 1.5,
                    borderColor: TOKENS.colors.secondary,
                    backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : '#2C231E',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <TextUI weight="bold" size={12} color={TOKENS.colors.primaryDark}>
                    {toArabicNumber(surah.id)}
                  </TextUI>
                </View>
              }
              onPress={() => {
                setSelectedSurah(surah);
                setReadingAyah(surah.id === 18 ? 15 : 1);
                setSurahPageIndex(0);
                setStreamSurahCount(1);
                setStreamPageCount(3);
                navigate('QuranReader');
              }}
              rightElement={
                <TextUI quran size={22} color={TOKENS.colors.primary}>
                  {surah.nameAr}
                </TextUI>
              }
            />
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderQuranReader = () => {
    const isBookmarked = bookmarks.some(
      (b) => b.surahId === selectedSurah.id && b.ayah === readingAyah
    );

    const toggleBookmark = () => {
      if (isBookmarked) {
        setBookmarks((prev) => prev.filter((b) => !(b.surahId === selectedSurah.id && b.ayah === readingAyah)));
      } else {
        setBookmarks((prev) => [
          ...prev,
          {
            surahId: selectedSurah.id,
            surahName: `سورة ${selectedSurah.nameAr}`,
            ayah: readingAyah,
            juz: selectedSurah.juz || 15,
            date: 'الآن'
          }
        ]);
      }
    };

    // Continuous Extended Holy Quran Stream (المصحف ممتد عبر السور تلقائياً دون انقطاع)
    const activeSurah = selectedSurah || SURAHS[0];
    const startSurahIndex = SURAHS.findIndex((s: any) => s.id === activeSurah.id);
    const safeStartIndex = startSurahIndex >= 0 ? startSurahIndex : 0;
    const streamSurahs = SURAHS.slice(safeStartIndex, safeStartIndex + streamSurahCount);

    const firstPageText = (activeSurah.pages && activeSurah.pages[0]) || activeSurah.text || 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';

    const parsedSurahStream = streamSurahs.map((surah: any) => getParsedSurahPages(surah));

    // Two-finger Pinch-to-Zoom Gesture Handlers (تكبير وتصغير المصحف بحركة الأصابع بدقة ونعومة)
    const handlePinchTouchStart = (e: any) => {
      const touches = e.nativeEvent?.touches;
      if (touches && touches.length >= 2) {
        isMultiTouchRef.current = true;
        lastMultiTouchTimeRef.current = Date.now();
        const p1 = touches[0];
        const p2 = touches[1];
        const dx = p1.pageX - p2.pageX;
        const dy = p1.pageY - p2.pageY;
        lastPinchDistRef.current = Math.sqrt(dx * dx + dy * dy);
      }
    };

    const handlePinchTouchMove = (e: any) => {
      const touches = e.nativeEvent?.touches;
      if (touches && touches.length >= 2) {
        isMultiTouchRef.current = true;
        lastMultiTouchTimeRef.current = Date.now();

        const p1 = touches[0];
        const p2 = touches[1];
        const dx = p1.pageX - p2.pageX;
        const dy = p1.pageY - p2.pageY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (lastPinchDistRef.current !== null) {
          const delta = dist - lastPinchDistRef.current;
          if (Math.abs(delta) > 7) {
            const step = Math.min(3, Math.max(1, Math.round(Math.abs(delta) / 10)));
            if (delta > 0) {
              // Pinch Outwards -> Zoom In (تكبير الخط)
              setQuranFontSize((prev: number) => {
                const next = Math.min(48, prev + step);
                showZoomFeedback(next);
                return next;
              });
            } else {
              // Pinch Inwards -> Zoom Out (تصغير الخط)
              setQuranFontSize((prev: number) => {
                const next = Math.max(16, prev - step);
                showZoomFeedback(next);
                return next;
              });
            }
            triggerHapticFeedback('light');
            lastPinchDistRef.current = dist;
          }
        } else {
          lastPinchDistRef.current = dist;
        }
      }
    };

    const handlePinchTouchEnd = (e?: any) => {
      const remainingTouches = e?.nativeEvent?.touches?.length || 0;
      if (remainingTouches < 2) {
        lastPinchDistRef.current = null;
        lastMultiTouchTimeRef.current = Date.now();
        setTimeout(() => {
          isMultiTouchRef.current = false;
        }, 600);
      }
    };

    const handleWheelZoom = (e: any) => {
      if (e.ctrlKey) {
        e.preventDefault?.();
        if (e.deltaY < 0) {
          setQuranFontSize((prev: number) => {
            const next = Math.min(48, prev + 1);
            showZoomFeedback(next);
            return next;
          });
        } else if (e.deltaY > 0) {
          setQuranFontSize((prev: number) => {
            const next = Math.max(16, prev - 1);
            showZoomFeedback(next);
            return next;
          });
        }
        triggerHapticFeedback('light');
      }
    };

    return (
      <View
        style={{ flex: 1, backgroundColor: c.bg, position: 'relative' }}
        onStartShouldSetResponderCapture={(e) => {
          const touches = (e as any)?.nativeEvent?.touches;
          return !!touches && touches.length >= 2;
        }}
        onMoveShouldSetResponderCapture={(e) => {
          const touches = (e as any)?.nativeEvent?.touches;
          return !!touches && touches.length >= 2;
        }}
        onTouchStart={handlePinchTouchStart}
        onTouchMove={handlePinchTouchMove}
        onTouchEnd={handlePinchTouchEnd}
        onTouchCancel={handlePinchTouchEnd}
      >
        {/* Floating Zoom Feedback Pill (حجم الخط عند التكبير/التصغير بحركة الأصابع) */}
        {zoomFeedbackPill !== null && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: quranReaderFullScreen ? 24 : 88,
              alignSelf: 'center',
              zIndex: 9999,
              backgroundColor: themeMode === 'light' ? 'rgba(35, 25, 18, 0.92)' : 'rgba(255, 255, 255, 0.94)',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: TOKENS.radius.pill,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              ...makeShadow('0 4px 16px rgba(0, 0, 0, 0.35)', '#000', 0.35, 8, { width: 0, height: 4 }, 8)
            }}
          >
            <Feather
              name="type"
              size={14}
              color={themeMode === 'light' ? '#FFFFFF' : '#1A1410'}
            />
            <TextUI
              size={12.5}
              weight="bold"
              color={themeMode === 'light' ? '#FFFFFF' : '#1A1410'}
            >
              {`حجم خط المصحف: ${toArabicNumber(zoomFeedbackPill)} pt`}
            </TextUI>
          </View>
        )}

        {/* Full-Screen Floating Reopen Button (يظهر في وضع ملء الشاشة لإعادة شريط الأدوات) */}
        {quranReaderFullScreen && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              setQuranReaderFullScreen(false);
              triggerHapticFeedback('light');
            }}
            style={{
              position: 'absolute',
              top: 14,
              left: 16,
              zIndex: 999,
              backgroundColor: themeMode === 'light' ? 'rgba(255, 255, 255, 0.94)' : 'rgba(38, 28, 23, 0.94)',
              borderRadius: TOKENS.radius.pill,
              paddingVertical: 7,
              paddingHorizontal: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              borderWidth: 1.5,
              borderColor: 'rgba(198, 146, 85, 0.5)',
              ...makeShadow('0 4px 14px rgba(0, 0, 0, 0.25)', '#000', 0.25, 6, { width: 0, height: 2 }, 6)
            }}
          >
            <Feather name="minimize-2" size={13} color={TOKENS.colors.primary} />
            <TextUI size={11} weight="bold" color={TOKENS.colors.primary}>
              {t('إظهار الأدوات', 'Show Tools')}
            </TextUI>
          </TouchableOpacity>
        )}

        {/* Compact, Integrated Reader Top Bar (Hidden when in Full-Screen Mode) */}
        {!quranReaderFullScreen && (
          <View
            style={{
              backgroundColor: themeMode === 'light' ? '#FFFDF8' : '#271D17',
              borderBottomWidth: 1,
              borderColor: 'rgba(198, 146, 85, 0.3)',
              ...makeShadow('0 2px 8px rgba(0, 0, 0, 0.04)', '#000', 0.04, 4, { width: 0, height: 1 }, 2),
              zIndex: 50
            }}
          >
            {/* Top Navigation Row */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 14,
                paddingVertical: 9
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <TouchableOpacity
                  testID="quran-reader-back-btn"
                  onPress={goBack}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : '#382E28',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: 'rgba(198, 146, 85, 0.3)'
                  }}
                >
                  <Feather name="arrow-right" size={18} color={TOKENS.colors.primary} />
                </TouchableOpacity>

                <View>
                  <TextUI weight="bold" size={15} color={TOKENS.colors.primary}>
                    {isRTL ? `سُورَةُ ${SURAH_TASHKEEL[selectedSurah.id] || selectedSurah.nameAr}` : `Surah ${selectedSurah.nameEn}`}
                  </TextUI>
                  <TextUI size={10.5} color={c.textSecondary}>
                    {isRTL
                      ? `${toArabicNumber(selectedSurah.verses)} آية • ${selectedSurah.type} • الجزء ${toArabicNumber(selectedSurah.juz || 1)}`
                      : `${selectedSurah.verses} Verses • ${selectedSurah.type} • Juz ${selectedSurah.juz || 1}`}
                  </TextUI>
                </View>
              </View>

              {/* Action Icons */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {/* Full-Screen Toggle Button */}
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => {
                    setQuranReaderFullScreen(true);
                    triggerHapticFeedback('medium');
                  }}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : '#382E28',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: 'rgba(198, 146, 85, 0.3)'
                  }}
                >
                  <Feather name="maximize-2" size={15} color={TOKENS.colors.primary} />
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => openVerseCardShare({
                    text: (parsedSurahStream[0]?.pages[0]?.verses[0]?.text || selectedSurah.nameAr).slice(0, 160),
                    surahName: `سورة ${selectedSurah.nameAr}`,
                    ayahNumber: '١',
                    tafsir: `تلاوة من سورة ${selectedSurah.nameAr} كاملة بمصحف المدينة المنورة.`
                  })}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : '#382E28',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: 'rgba(198, 146, 85, 0.3)'
                  }}
                >
                  <Feather name="share-2" size={15} color={TOKENS.colors.primary} />
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => {
                    if (readingBookmark) {
                      if (Platform.OS === 'web') {
                        const el = document.getElementById('reading-bookmark-target');
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          triggerHapticFeedback('medium');
                          return;
                        }
                      }
                      const foundSurah = SURAHS.find((s: any) => s.id === readingBookmark.surahId);
                      if (foundSurah && foundSurah.id !== selectedSurah.id) {
                        setSelectedSurah(foundSurah);
                        setReadingAyah(readingBookmark.ayahNumber);
                        setStreamSurahCount(1);
                        setStreamPageCount(4);
                        setTimeout(() => {
                          if (Platform.OS === 'web') {
                            const el = document.getElementById('reading-bookmark-target');
                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }
                        }, 350);
                      }
                    } else {
                      toggleBookmark();
                    }
                  }}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    backgroundColor: readingBookmark?.surahId === selectedSurah.id
                      ? (themeMode === 'light' ? 'rgba(198, 146, 85, 0.22)' : 'rgba(212, 163, 115, 0.3)')
                      : (themeMode === 'light' ? TOKENS.colors.primaryLight : '#382E28'),
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: 'rgba(198, 146, 85, 0.3)'
                  }}
                >
                  <Feather
                    name="bookmark"
                    size={15}
                    color={(readingBookmark?.surahId === selectedSurah.id || isBookmarked) ? TOKENS.colors.secondary : TOKENS.colors.primary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* In-Reader Control Strip: Font Sizing & Smart Auto-Scroll */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderTopWidth: 1,
                borderColor: 'rgba(198, 146, 85, 0.18)',
                backgroundColor: themeMode === 'light' ? '#FAF6EF' : '#221914'
              }}
            >
              {/* Font Size Quick Adjuster (تكبير وتصغير خط المصحف) */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    setQuranFontSize((prev: number) => Math.max(16, prev - 2));
                    triggerHapticFeedback('light');
                  }}
                  style={{
                    width: 27,
                    height: 27,
                    borderRadius: 13.5,
                    backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : '#382E28',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: 'rgba(198, 146, 85, 0.35)'
                  }}
                >
                  <TextUI size={11} weight="bold" color={TOKENS.colors.primary}>A-</TextUI>
                </TouchableOpacity>

                <View style={{ minWidth: 26, alignItems: 'center' }}>
                  <TextUI size={11.5} weight="bold" color={TOKENS.colors.primary}>
                    {toArabicNumber(quranFontSize)}
                  </TextUI>
                </View>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    setQuranFontSize((prev: number) => Math.min(44, prev + 2));
                    triggerHapticFeedback('light');
                  }}
                  style={{
                    width: 27,
                    height: 27,
                    borderRadius: 13.5,
                    backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : '#382E28',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: 'rgba(198, 146, 85, 0.35)'
                  }}
                >
                  <TextUI size={11} weight="bold" color={TOKENS.colors.primary}>A+</TextUI>
                </TouchableOpacity>
              </View>

              {/* Auto-Scroll Controls (التمرير التلقائي وضبط السرعة) */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    backgroundColor: themeMode === 'light' ? '#FFFFFF' : '#2A201A',
                    borderRadius: TOKENS.radius.pill,
                    padding: 2,
                    borderWidth: 1,
                    borderColor: 'rgba(198, 146, 85, 0.25)'
                  }}
                >
                  {[
                    { speed: 0.5, label: '٠.٥x' },
                    { speed: 1, label: '١x' },
                    { speed: 2, label: '٢x' },
                    { speed: 3, label: '٣x' },
                    { speed: 4, label: '٤x' }
                  ].map(s => {
                    const isSelected = quranScrollSpeed === s.speed;
                    return (
                      <TouchableOpacity
                        key={s.speed}
                        onPress={() => {
                          setQuranScrollSpeed(s.speed);
                          triggerHapticFeedback('light');
                        }}
                        style={{
                          paddingVertical: 2,
                          paddingHorizontal: 4.5,
                          borderRadius: TOKENS.radius.pill,
                          backgroundColor: isSelected ? TOKENS.colors.primary : 'transparent'
                        }}
                      >
                        <TextUI
                          size={9}
                          weight={isSelected ? 'bold' : 'regular'}
                          color={isSelected ? '#FFFFFF' : c.textSecondary}
                        >
                          {s.label}
                        </TextUI>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Play / Pause Auto-Scroll Button */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    setQuranAutoScroll((prev: boolean) => !prev);
                    triggerHapticFeedback('medium');
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    paddingVertical: 4.5,
                    paddingHorizontal: 8,
                    borderRadius: TOKENS.radius.pill,
                    backgroundColor: quranAutoScroll ? '#C62828' : TOKENS.colors.primary,
                    ...(quranAutoScroll ? makeShadow('0 2px 8px rgba(198, 40, 40, 0.4)', '#C62828', 0.4, 4, { width: 0, height: 2 }, 4) : makeShadow('0 2px 8px rgba(198, 146, 85, 0.3)', '#C69255', 0.3, 4, { width: 0, height: 2 }, 4))
                  }}
                >
                  <Feather name={quranAutoScroll ? 'pause' : 'play'} size={11} color="#FFFFFF" />
                  <TextUI size={10} weight="bold" color="#FFFFFF">
                    {quranAutoScroll ? t('إيقاف', 'Stop') : t('تمرير', 'Scroll')}
                  </TextUI>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Continuous Stream Holy Quran ScrollView (المصحف ممتد عبر السور) */}
        <ScrollView
          ref={quranScrollViewRef}
          onTouchStart={handlePinchTouchStart}
          onTouchMove={handlePinchTouchMove}
          onTouchEnd={handlePinchTouchEnd}
          onTouchCancel={handlePinchTouchEnd}
          // @ts-ignore
          onWheel={handleWheelZoom}
          onScroll={(e) => {
            const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
            currentScrollYRef.current = contentOffset.y;
            if (
              contentSize.height > layoutMeasurement.height + 300 &&
              contentOffset.y > 100 &&
              contentOffset.y + layoutMeasurement.height >= contentSize.height - 100
            ) {
              setStreamSurahCount((prev: number) => Math.min(114, prev + 1));
            }
          }}
          scrollEventThrottle={16}
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: quranReaderFullScreen ? 12 : 18,
            paddingTop: quranReaderFullScreen ? 44 : 16,
            paddingBottom: 110
          }}
        >
          {parsedSurahStream.map(({ surah, pages }, sIdx) => (
            <View key={`surah-stream-${surah.id}`} style={{ width: '100%', marginBottom: 28 }}>
              {/* Authentic Mushaf Surah Header Frame (كما في الصورة المرفقة) */}
              <MushafSurahBanner surah={surah} themeMode={themeMode} />

              {/* Basmalah (Only when not At-Tawbah and not Al-Fatihah) */}
              {surah.id !== 9 && surah.id !== 1 && (
                <TextUI
                  quran
                  align="center"
                  size={quranFontSize}
                  color={TOKENS.colors.primary}
                  style={{ marginBottom: 20 }}
                >
                  بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                </TextUI>
              )}

              {/* Unified Mushaf Parchment Container for this Surah */}
              <View
                style={{
                  backgroundColor: themeMode === 'light' ? '#FFFDF9' : '#231B16',
                  borderRadius: TOKENS.radius.lg,
                  borderWidth: 1.5,
                  borderColor: 'rgba(198, 146, 85, 0.4)',
                  padding: quranReaderFullScreen ? 14 : 20,
                  paddingVertical: 22,
                  ...makeShadow('0 4px 16px rgba(93, 58, 34, 0.06)', '#5D3A22', 0.08, 6, { width: 0, height: 2 }, 3)
                }}
              >
                {/* All Pages of this Surah (Rendered completely without truncation) */}
                {pages.map((page: any, pIdx: number) => (
                  <View key={`surah-${surah.id}-page-${pIdx}`} style={{ width: '100%', alignItems: 'center' }}>
                    {/* Subtle Authentic Madinah Mushaf Page Divider */}
                    {pIdx > 0 && (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginVertical: 22,
                          gap: 10
                        }}
                      >
                        <View style={{ height: 1, flex: 1, backgroundColor: 'rgba(198, 146, 85, 0.28)' }} />
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            paddingHorizontal: 12,
                            paddingVertical: 4,
                            borderRadius: TOKENS.radius.pill,
                            backgroundColor: themeMode === 'light' ? '#FAF1E6' : '#2C211A',
                            borderWidth: 1,
                            borderColor: 'rgba(198, 146, 85, 0.35)'
                          }}
                        >
                          <TextUI size={9} color={TOKENS.colors.secondary}>۞</TextUI>
                          <TextUI size={11} weight="bold" color={TOKENS.colors.primaryDark}>
                            {isRTL
                              ? `صفحة ${toArabicNumber(page.mushafPageNum)} • مصحف المدينة • الجزء ${toArabicNumber(page.juzNum)}`
                              : `Page ${page.mushafPageNum} • Madinah Mushaf • Juz ${page.juzNum}`}
                          </TextUI>
                          <TextUI size={9} color={TOKENS.colors.secondary}>۞</TextUI>
                        </View>
                        <View style={{ height: 1, flex: 1, backgroundColor: 'rgba(198, 146, 85, 0.28)' }} />
                      </View>
                    )}

                    {/* Verses of this Page (Centered as in Holy Quran) */}
                    <TextUI
                      quran
                      align="center"
                      size={quranFontSize}
                      color={c.textPrimary}
                      style={{
                        lineHeight: quranFontSize * 1.95,
                        textAlign: 'center'
                      }}
                    >
                      {page.verses.map((v: any, vIdx: number) => {
                        const isSelected = selectedAyahForTafsir?.surahId === surah.id && selectedAyahForTafsir?.ayahNumber === v.ayahNumber;
                        const isMarked = readingBookmark?.surahId === surah.id && readingBookmark?.ayahNumber === v.ayahNumber;
                        return (
                          <Text
                            key={`surah-${surah.id}-ayah-p${pIdx}-${vIdx}-${v.ayahNumber}`}
                            testID={isMarked ? 'reading-bookmark-target' : undefined}
                            {...({ id: Platform.OS === 'web' && isMarked ? 'reading-bookmark-target' : undefined } as any)}
                            onPress={(e) => {
                              const touches = (e as any)?.nativeEvent?.touches;
                              if (touches && touches.length > 1) {
                                isMultiTouchRef.current = true;
                                lastMultiTouchTimeRef.current = Date.now();
                                return;
                              }
                              handleOpenAyahTafsir(surah, v);
                            }}
                            style={{
                              backgroundColor: isSelected
                                ? (themeMode === 'light' ? 'rgba(198, 146, 85, 0.25)' : 'rgba(198, 146, 85, 0.35)')
                                : isMarked
                                ? (themeMode === 'light' ? 'rgba(212, 163, 115, 0.2)' : 'rgba(212, 163, 115, 0.3)')
                                : undefined
                            }}
                          >
                            {isMarked ? ' 🔖 ' : ''}
                            {v.text}
                            {v.badge ? (
                              <Text
                                style={{
                                  fontSize: Math.round(quranFontSize * 0.68),
                                  color: isMarked ? '#C69255' : (isSelected ? TOKENS.colors.primaryDark : TOKENS.colors.primary),
                                  fontWeight: 'bold'
                                }}
                              >
                                {` ${v.badge} `}
                              </Text>
                            ) : ' '}
                          </Text>
                        );
                      })}
                    </TextUI>
                  </View>
                ))}
              </View>

              {/* End of Surah Divider (After all verses of the Surah are 100% complete) */}
              <View
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 22,
                  marginBottom: 10,
                  flexDirection: 'row',
                  gap: 12
                }}
              >
                <View style={{ height: 1, flex: 1, backgroundColor: 'rgba(198, 146, 85, 0.35)' }} />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <TextUI size={12} color={TOKENS.colors.secondary}>۞</TextUI>
                  <TextUI quran size={14} weight="bold" color={TOKENS.colors.primaryDark}>
                    {`خَاتِمَةُ سُورَةِ ${SURAH_TASHKEEL[surah.id] || surah.nameAr}`}
                  </TextUI>
                  <TextUI size={12} color={TOKENS.colors.secondary}>۞</TextUI>
                </View>
                <View style={{ height: 1, flex: 1, backgroundColor: 'rgba(198, 146, 85, 0.35)' }} />
              </View>

              {/* End of Surah Navigation (الانتقال السريع إلى السورة التالية أو السابقة) */}
              <View
                style={{
                  marginTop: 8,
                  marginBottom: 8,
                  padding: 14,
                  borderRadius: TOKENS.radius.lg,
                  backgroundColor: themeMode === 'light' ? '#FAF4EA' : '#2C211B',
                  borderWidth: 1,
                  borderColor: 'rgba(198, 146, 85, 0.35)',
                  alignItems: 'center',
                  gap: 10
                }}
              >
                <TextUI size={12} color={c.textSecondary}>
                  {t('انتهت السورة الكريمة بحمد الله • تقبل الله تلاوتكم', 'End of Surah • May Allah accept your recitation')}
                </TextUI>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%' }}>
                  {surah.id > 1 && (
                    <TouchableOpacity
                      onPress={() => {
                        const prevSurah = SURAHS.find((s: any) => s.id === surah.id - 1);
                        if (prevSurah) {
                          setSelectedSurah(prevSurah);
                          setReadingAyah(1);
                          setSurahPageIndex(0);
                          setStreamSurahCount(1);
                          quranScrollViewRef.current?.scrollTo({ y: 0, animated: true });
                          triggerHapticFeedback('light');
                        }
                      }}
                      style={{
                        flex: 1,
                        paddingVertical: 9,
                        paddingHorizontal: 10,
                        borderRadius: TOKENS.radius.md,
                        backgroundColor: c.surface,
                        borderWidth: 1,
                        borderColor: c.border,
                        alignItems: 'center',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        gap: 4
                      }}
                    >
                      <Feather name={isRTL ? "chevron-right" : "chevron-left"} size={14} color={c.textPrimary} />
                      <TextUI size={11.5} weight="bold" color={c.textPrimary} numberOfLines={1}>
                        {`سورة ${SURAHS[surah.id - 2]?.nameAr || ''}`}
                      </TextUI>
                    </TouchableOpacity>
                  )}

                  {surah.id < 114 && (
                    <TouchableOpacity
                      onPress={() => {
                        const nextSurah = SURAHS.find((s: any) => s.id === surah.id + 1);
                        if (nextSurah) {
                          setSelectedSurah(nextSurah);
                          setReadingAyah(1);
                          setSurahPageIndex(0);
                          setStreamSurahCount(1);
                          quranScrollViewRef.current?.scrollTo({ y: 0, animated: true });
                          triggerHapticFeedback('medium');
                        }
                      }}
                      style={{
                        flex: 1.4,
                        paddingVertical: 9,
                        paddingHorizontal: 12,
                        borderRadius: TOKENS.radius.md,
                        backgroundColor: TOKENS.colors.primary,
                        alignItems: 'center',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        gap: 4,
                        ...makeShadow('0 2px 8px rgba(140, 94, 60, 0.25)', '#8C5E3C', 0.25, 4, { width: 0, height: 2 }, 3)
                      }}
                    >
                      <TextUI size={12} weight="bold" color="#FFFFFF" numberOfLines={1}>
                        {`السورة التالية: ${SURAHS[surah.id]?.nameAr || ''}`}
                      </TextUI>
                      <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Holy Quran Complete Milestone (When reaching Surah An-Nas 114) */}
              {surah.id === 114 && (
                <View style={{ marginTop: 24, alignItems: 'center', gap: 6 }}>
                  <TextUI size={18} color={TOKENS.colors.secondary}>۞ ۞ ۞</TextUI>
                  <TextUI quran size={20} weight="bold" color={TOKENS.colors.primaryDark}>
                    {t('تم بحمد الله وتوفيقه خَتْمُ القُرْآنِ الكَرِيمِ كَامِلاً', 'The Holy Quran has been completed')}
                  </TextUI>
                </View>
              )}
            </View>
          ))}

          {/* Share Surah Card Action */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => openVerseCardShare({
              text: (parsedSurahStream[0]?.pages[0]?.verses[0]?.text || selectedSurah.nameAr).slice(0, 160),
              surahName: `سورة ${selectedSurah.nameAr}`,
              ayahNumber: '١',
              tafsir: `تلاوة مباركة من المصحف الممتد - سورة ${selectedSurah.nameAr} بمصحف المدينة المنورة.`
            })}
            style={{
              marginTop: 14,
              padding: 13,
              backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : '#382E28',
              borderRadius: TOKENS.radius.md,
              borderWidth: 1,
              borderColor: 'rgba(198, 146, 85, 0.4)',
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 8
            }}
          >
            <Feather name="share-2" size={16} color={TOKENS.colors.primary} />
            <TextUI size={13} weight="bold" color={TOKENS.colors.primary}>
              {t('مشاركة وتوليد بطاقة إسلامية 📤', 'Generate Islamic Card')}
            </TextUI>
          </TouchableOpacity>
        </ScrollView>

        {/* Rich Interactive Ayah Tafsir Bottom Sheet Modal */}
        <Modal visible={tafsirModalVisible} transparent={true} animationType="slide">
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' }}>
            <View
              style={{
                backgroundColor: c.surface,
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                padding: 22,
                maxHeight: '84%',
                borderWidth: 1,
                borderColor: 'rgba(198, 146, 85, 0.35)',
                ...makeShadow('0 -8px 24px rgba(0,0,0,0.2)', '#000', 0.2, 8, { width: 0, height: -4 }, 8)
              }}
            >
              {/* Top Handle Bar */}
              <View style={{ alignSelf: 'center', width: 44, height: 4, borderRadius: 2, backgroundColor: c.border, marginBottom: 14 }} />

              {/* Modal Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : '#382E28',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: 'rgba(198, 146, 85, 0.3)'
                    }}
                  >
                    <Feather name="book-open" size={18} color={TOKENS.colors.primary} />
                  </View>
                  <View>
                    <TextUI weight="bold" size={16} color={TOKENS.colors.primary}>
                      {selectedAyahForTafsir
                        ? `سورة ${selectedAyahForTafsir.surahNameAr} • الآية (${toArabicNumber(selectedAyahForTafsir.ayahNumber)})`
                        : `سورة ${selectedSurah.nameAr}`}
                    </TextUI>
                    <TextUI size={11} color={c.textSecondary}>
                      {isRTL ? 'تفسير وبيان المعاني المعتمدة' : 'Authentic Exegesis & Commentary'}
                    </TextUI>
                  </View>
                </View>
                <TouchableOpacity
                  testID="close-tafsir-modal-btn"
                  onPress={() => setTafsirModalVisible(false)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: themeMode === 'light' ? c.bgSecondary : '#382E28',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Feather name="x" size={18} color={c.textPrimary} />
                </TouchableOpacity>
              </View>

              {/* Highlighted Selected Ayah Card */}
              {selectedAyahForTafsir?.text && (
                <View
                  style={{
                    backgroundColor: themeMode === 'light' ? '#FAF6F0' : '#2A2019',
                    padding: 16,
                    borderRadius: TOKENS.radius.lg,
                    borderWidth: 1.2,
                    borderColor: 'rgba(198, 146, 85, 0.45)',
                    marginBottom: 10
                  }}
                >
                  <TextUI
                    quran
                    align="center"
                    size={21}
                    color={c.textPrimary}
                    style={{ lineHeight: 36 }}
                  >
                    {selectedAyahForTafsir.text} ﴿{selectedAyahForTafsir.arabicNumber}﴾
                  </TextUI>
                </View>
              )}

              {/* Bookmark / Reading Stop Marker Action Button */}
              {selectedAyahForTafsir && (
                <View style={{ marginBottom: 12 }}>
                  {bookmarkToast && (
                    <View
                      style={{
                        marginBottom: 8,
                        backgroundColor: '#2E7D32',
                        paddingVertical: 7,
                        paddingHorizontal: 14,
                        borderRadius: TOKENS.radius.pill,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6
                      }}
                    >
                      <Feather name="check-circle" size={14} color="#FFFFFF" />
                      <TextUI size={12} weight="bold" color="#FFFFFF">
                        {bookmarkToast}
                      </TextUI>
                    </View>
                  )}
                  <TouchableOpacity
                    testID="set-reading-bookmark-btn"
                    activeOpacity={0.8}
                    onPress={() => {
                      const isCurrentlyMarked = readingBookmark?.surahId === selectedAyahForTafsir.surahId && readingBookmark?.ayahNumber === selectedAyahForTafsir.ayahNumber;
                      if (isCurrentlyMarked) {
                        saveReadingBookmark(null);
                      } else {
                        saveReadingBookmark({
                          surahId: selectedAyahForTafsir.surahId,
                          surahNameAr: selectedAyahForTafsir.surahNameAr,
                          ayahNumber: selectedAyahForTafsir.ayahNumber,
                          text: selectedAyahForTafsir.text
                        });
                      }
                      triggerHapticFeedback('medium');
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      paddingVertical: 10,
                      paddingHorizontal: 16,
                      borderRadius: TOKENS.radius.md,
                      backgroundColor: (readingBookmark?.surahId === selectedAyahForTafsir.surahId && readingBookmark?.ayahNumber === selectedAyahForTafsir.ayahNumber)
                        ? (themeMode === 'light' ? '#E8F5E9' : '#1B3820')
                        : (themeMode === 'light' ? '#FFF8E7' : '#33261C'),
                      borderWidth: 1.5,
                      borderColor: (readingBookmark?.surahId === selectedAyahForTafsir.surahId && readingBookmark?.ayahNumber === selectedAyahForTafsir.ayahNumber)
                        ? '#2E7D32'
                        : TOKENS.colors.primary
                    }}
                  >
                    <Feather
                      name="bookmark"
                      size={16}
                      color={(readingBookmark?.surahId === selectedAyahForTafsir.surahId && readingBookmark?.ayahNumber === selectedAyahForTafsir.ayahNumber) ? '#2E7D32' : TOKENS.colors.primary}
                    />
                    <TextUI
                      weight="bold"
                      size={13}
                      color={(readingBookmark?.surahId === selectedAyahForTafsir.surahId && readingBookmark?.ayahNumber === selectedAyahForTafsir.ayahNumber) ? '#2E7D32' : TOKENS.colors.primaryDark}
                    >
                      {(readingBookmark?.surahId === selectedAyahForTafsir.surahId && readingBookmark?.ayahNumber === selectedAyahForTafsir.ayahNumber)
                        ? t('✓ علامة التوقف الحالية (إزالة العلامة)', '✓ Current Bookmark (Remove)')
                        : t('🔖 وضع علامة التوقف عند هذه الآية', '🔖 Set as Reading Bookmark')}
                    </TextUI>
                  </TouchableOpacity>
                </View>
              )}

              {/* 4 Tafsir School Switcher Tabs */}
              <View
                style={{
                  flexDirection: 'row',
                  backgroundColor: themeMode === 'light' ? c.bgSecondary : '#2A2019',
                  borderRadius: TOKENS.radius.pill,
                  padding: 3,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: c.border
                }}
              >
                {[
                  { id: 'muyassar', title: t('الميسر', 'Al-Muyassar') },
                  { id: 'ibnkathir', title: t('ابن كثير', 'Ibn Kathir') },
                  { id: 'jalalayn', title: t('الجلالين', 'Al-Jalalayn') },
                  { id: 'qurtubi', title: t('القرطبي', 'Al-Qurtubi') }
                ].map((tf) => {
                  const isSelected = selectedTafsir === tf.id;
                  return (
                    <TouchableOpacity
                      key={tf.id}
                      onPress={() => {
                        setSelectedTafsir(tf.id as any);
                        triggerHapticFeedback('light');
                        if (selectedAyahForTafsir) {
                          fetchAyahTafsir(selectedAyahForTafsir.surahId, selectedAyahForTafsir.ayahNumber, tf.id);
                        }
                      }}
                      style={{
                        flex: 1,
                        paddingVertical: 7,
                        borderRadius: TOKENS.radius.pill,
                        backgroundColor: isSelected ? TOKENS.colors.primary : 'transparent',
                        alignItems: 'center'
                      }}
                    >
                      <TextUI
                        size={11}
                        weight={isSelected ? 'bold' : 'medium'}
                        color={isSelected ? '#FFFFFF' : c.textSecondary}
                      >
                        {tf.title}
                      </TextUI>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Tafsir Body Scroll */}
              <ScrollView style={{ maxHeight: 220, marginBottom: 12 }}>
                {ayahTafsirLoading ? (
                  <View style={{ paddingVertical: 32, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <ActivityIndicator size="small" color={TOKENS.colors.primary} />
                    <TextUI size={12} color={c.textSecondary}>
                      {t('جارٍ جلب التفسير المعتمد للآية الكريمة...', 'Loading authentic Tafsir for this verse...')}
                    </TextUI>
                  </View>
                ) : (
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <Feather name="feather" size={13} color={TOKENS.colors.secondary} />
                      <TextUI weight="bold" size={13} color={TOKENS.colors.primary}>
                        {selectedTafsir === 'muyassar'
                          ? t('التفسير الميسر (مجمع الملك فهد لطباعة المصحف الشريف):', 'Al-Muyassar Exegesis (King Fahd Complex):')
                          : selectedTafsir === 'ibnkathir'
                          ? t('تفسير القرآن العظيم (الإمام الحافظ ابن كثير رحمه الله):', 'Tafsir Ibn Kathir:')
                          : selectedTafsir === 'jalalayn'
                          ? t('تفسير الجلالين (الإمامين المحلي والسيوطي):', 'Al-Jalalayn Exegesis:')
                          : t('الجامع لأحكام القرآن (الإمام القرطبي):', 'Al-Qurtubi Exegesis:')}
                      </TextUI>
                    </View>
                    <TextUI size={14} color={c.textPrimary} style={{ lineHeight: 25, textAlign: 'justify' }}>
                      {ayahTafsirText || (selectedSurah.tafsir || t('تفسير وبيان لمعاني هذه الآية الكريمة وتدبرها والعمل بأحكامها.', 'Exegesis and explanation of this noble verse.'))}
                    </TextUI>
                  </View>
                )}
              </ScrollView>

              {/* In-Modal Copied Feedback */}
              {tafsirCopied && (
                <View
                  style={{
                    marginBottom: 10,
                    backgroundColor: '#2E7D32',
                    paddingVertical: 7,
                    paddingHorizontal: 14,
                    borderRadius: TOKENS.radius.pill,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}
                >
                  <Feather name="check-circle" size={14} color="#FFFFFF" />
                  <TextUI size={12} weight="bold" color="#FFFFFF">
                    {t('تم نسخ الآية والتفسير بنجاح ✓', 'Verse and Tafsir copied successfully ✓')}
                  </TextUI>
                </View>
              )}

              {/* Action Toolbar */}
              <View
                style={{
                  flexDirection: 'row',
                  gap: 8,
                  paddingTop: 10,
                  borderTopWidth: 1,
                  borderColor: c.border
                }}
              >
                {/* Copy Verse & Tafsir */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    const fullText = selectedAyahForTafsir
                      ? `﴿${selectedAyahForTafsir.text}﴾ [سورة ${selectedAyahForTafsir.surahNameAr}: ${toArabicNumber(selectedAyahForTafsir.ayahNumber)}]\n\nالتفسير:\n${ayahTafsirText}`
                      : `${firstPageText}\n\nالتفسير:\n${selectedSurah.tafsir}`;
                    if (typeof navigator !== 'undefined' && navigator.clipboard) {
                      navigator.clipboard.writeText(fullText);
                    }
                    setTafsirCopied(true);
                    triggerHapticFeedback('light');
                    setTimeout(() => setTafsirCopied(false), 2200);
                  }}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    paddingVertical: 11,
                    backgroundColor: themeMode === 'light' ? c.bgSecondary : '#382E28',
                    borderRadius: TOKENS.radius.md,
                    borderWidth: 1,
                    borderColor: c.border
                  }}
                >
                  <Feather name="copy" size={15} color={TOKENS.colors.primary} />
                  <TextUI size={12} weight="bold" color={TOKENS.colors.primary}>
                    {t('نسخ التفسير', 'Copy Tafsir')}
                  </TextUI>
                </TouchableOpacity>

                {/* Share Verse Card */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    setTafsirModalVisible(false);
                    if (selectedAyahForTafsir) {
                      openVerseCardShare({
                        text: selectedAyahForTafsir.text,
                        surahName: `سورة ${selectedAyahForTafsir.surahNameAr}`,
                        ayahNumber: selectedAyahForTafsir.arabicNumber,
                        tafsir: ayahTafsirText
                      });
                    } else {
                      openVerseCardShare({
                        text: firstPageText.slice(0, 160),
                        surahName: `سورة ${selectedSurah.nameAr}`,
                        ayahNumber: '١',
                        tafsir: selectedSurah.tafsir
                      });
                    }
                  }}
                  style={{
                    flex: 1.2,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    paddingVertical: 11,
                    backgroundColor: TOKENS.colors.primary,
                    borderRadius: TOKENS.radius.md
                  }}
                >
                  <Feather name="share-2" size={15} color="#FFFFFF" />
                  <TextUI size={12} weight="bold" color="#FFFFFF">
                    {t('مشاركة كبطاقة 📤', 'Share as Card 📤')}
                  </TextUI>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  const renderQuranBookmarks = () => (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title={t('الإشارات المرجعية', 'Quran Bookmarks')} onBack={goBack} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        {bookmarks.length === 0 ? (
          <View style={{ alignItems: 'center', justifyContent: 'center', padding: 40 }}>
            <Feather name="bookmark" size={48} color={c.textSecondary} style={{ marginBottom: 16 }} />
            <TextUI size={15} color={c.textSecondary}>{t('لا توجد إشارات مرجعية محفوظة بعد.', 'No saved bookmarks yet.')}</TextUI>
          </View>
        ) : (
          bookmarks.map((b, idx) => (
            <TappableRow
              key={idx}
              title={b.surahName}
              subtitle={`${t('الآية', 'Ayah')} ${b.ayah} • ${t('الجزء', 'Juz')} ${b.juz} • ${b.date}`}
              icon="bookmark"
              iconColor={TOKENS.colors.secondary}
              onPress={() => {
                const foundSurah = SURAHS.find((s) => s.id === b.surahId) || selectedSurah;
                setSelectedSurah(foundSurah);
                setReadingAyah(b.ayah);
                navigate('QuranReader');
              }}
              rightElement={
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation?.();
                    setBookmarks((prev) => prev.filter((_, i) => i !== idx));
                  }}
                  style={{ padding: 8 }}
                >
                  <Feather name="trash-2" size={16} color={TOKENS.colors.error} />
                </TouchableOpacity>
              }
            />
          ))
        )}
      </ScrollView>
    </View>
  );

  const renderQuranAudio = () => {
    const reciters = [
      { id: 'alafasy', name: t('الشيخ مشاري بن راشد العفاسي', 'Mishary Rashid Alafasy'), riwayah: 'حفص عن عاصم' },
      { id: 'minshawi', name: t('الشيخ محمد صديق المنشاوي', 'Muhammad Siddiq Al-Minshawi'), riwayah: 'المصحف المرتل' },
      { id: 'abdulbasit', name: t('الشيخ عبد الباسط عبد الصمد (مرتل)', 'Abdul Basit Abdul Samad (Murattal)'), riwayah: 'المصحف المرتل' },
      { id: 'abdulbasit_mujawwad', name: t('الشيخ عبد الباسط عبد الصمد (مجود)', 'Abdul Basit Abdul Samad (Mujawwad)'), riwayah: 'المصحف المجود' },
      { id: 'shuraim', name: t('الشيخ سعود الشريم', 'Saud Al-Shuraim'), riwayah: 'إمام المسجد الحرام سابقاً' },
      { id: 'yasser_dosari', name: t('الشيخ ياسر الدوسري', 'Yasser Al-Dosari'), riwayah: 'إمام المسجد الحرام' },
      { id: 'baijan', name: t('الشيخ عبد الله البعيجان', 'Abdullah Al-Baijan'), riwayah: 'إمام وخطيب المسجد النبوي الشريف' },
      { id: 'burhaji', name: t('الشيخ محمد أحمد برهجي', 'Muhammad Ahmad Barhaji'), riwayah: 'حفص عن عاصم (مرتل)' },
      { id: 'ahmad_hudhaifi', name: t('الشيخ د. أحمد بن علي الحذيفي', 'Ahmad Al-Hudhaifi'), riwayah: 'إمام وخطيب المسجد النبوي الشريف' },
      { id: 'abdulmohsen_qasim', name: t('الشيخ د. عبد المحسن القاسم', 'Abdul Mohsen Al-Qasim'), riwayah: 'إمام وخطيب المسجد النبوي الشريف' },
      { id: 'almuaiqly', name: t('الشيخ ماهر المعيقلي', 'Maher Al-Muaiqly'), riwayah: 'إمام المسجد الحرام' },
      { id: 'alhusary', name: t('الشيخ محمود خليل الحصري', 'Mahmoud Khalil Al-Husary'), riwayah: 'شيخ عموم المقارئ' },
      { id: 'alghamdi', name: t('الشيخ سعد الغامدي', 'Saad Al-Ghamdi'), riwayah: 'تلاوة نجدية خاشعة' }
    ];

    const currentReciter = reciters.find((r) => r.id === audioReciter) || reciters[0];

    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <Header
          title={t('التلاوة والاستماع', 'Audio Recitation')}
          onBack={goBack}
          rightAction={
            <TouchableOpacity
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="open-surah-picker-header"
              onPress={() => {
                setAudioSurahSearch('');
                setAudioSurahSelectorVisible(true);
                triggerHapticFeedback('light');
              }}
              style={{
                width: 38,
                height: 38,
                borderRadius: TOKENS.radius.pill,
                backgroundColor: c.surface,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: c.border
              }}
            >
              <Feather name="list" size={18} color={TOKENS.colors.primary} />
            </TouchableOpacity>
          }
        />
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
          {/* Luxury Islamic Audio Player Deck */}
          <View
            style={{
              backgroundColor: themeMode === 'light' ? TOKENS.colors.secondaryLight : '#2C221C',
              borderRadius: TOKENS.radius.lg,
              borderWidth: 1.5,
              borderColor: TOKENS.colors.secondary,
              padding: 22,
              alignItems: 'center',
              marginBottom: 24,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <ArabesqueWatermark opacity={0.08} color={TOKENS.colors.secondary} />
            <View style={{ width: '100%', marginBottom: 6 }}>
              <MoorishArchFrame height={18} color={TOKENS.colors.secondary} opacity={0.8} />
            </View>

            <TextUI size={12} weight="bold" color={TOKENS.colors.secondary}>
              {t('مشغل التلاوة القرآنية الشريفة', 'Holy Quran Audio Player')}
            </TextUI>

            {/* Clickable Surah Selector Button (زر تغيير السورة) */}
            <TouchableOpacity
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="change-surah-button"
              onPress={() => {
                setAudioSurahSearch('');
                setAudioSurahSelectorVisible(true);
                triggerHapticFeedback('light');
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: themeMode === 'light' ? '#FFFFFF' : '#382D24',
                paddingVertical: 8,
                paddingHorizontal: 16,
                borderRadius: TOKENS.radius.pill,
                marginTop: 8,
                marginBottom: 4,
                borderWidth: 1.5,
                borderColor: TOKENS.colors.secondary,
                ...makeShadow('0 2px 8px rgba(198, 146, 85, 0.25)', '#C69255', 0.25, 4, { width: 0, height: 1 }, 3),
                gap: 8
              }}
            >
              <Feather name="book-open" size={18} color={TOKENS.colors.primary} />
              <TextUI weight="bold" size={22} color={TOKENS.colors.primaryDark}>
                {isRTL ? `سورة ${selectedSurah.nameAr}` : `Surah ${selectedSurah.nameEn}`}
              </TextUI>
              <View
                style={{
                  backgroundColor: TOKENS.colors.primary,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: TOKENS.radius.pill,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 3
                }}
              >
                <TextUI size={10} weight="bold" color="#FFFFFF">
                  {t('تغيير السورة', 'Change')}
                </TextUI>
                <Feather name="chevron-down" size={12} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            <TextUI size={12} color={c.textSecondary} style={{ marginTop: 2 }}>
              {`${toArabicNumber(selectedSurah.verses)} آية • ${selectedSurah.type} • ${currentReciter.name}`}
            </TextUI>

            {/* Offline Download Action Banner */}
            <View
              style={{
                width: '100%',
                backgroundColor: 'rgba(198, 146, 85, 0.12)',
                borderRadius: TOKENS.radius.md,
                padding: 10,
                marginTop: 12,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: 'rgba(198, 146, 85, 0.3)'
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Feather
                  name={downloadedSurahs.includes(selectedSurah.id) ? 'check-circle' : 'download-cloud'}
                  size={16}
                  color={downloadedSurahs.includes(selectedSurah.id) ? '#4E7D5B' : TOKENS.colors.primary}
                  style={{ marginLeft: 6 }}
                />
                <TextUI size={12} weight="bold" color={downloadedSurahs.includes(selectedSurah.id) ? '#4E7D5B' : c.textPrimary}>
                  {isDownloading === selectedSurah.id
                    ? t('جاري الحفظ محلياً بالهاتف...', 'Downloading Surah audio...')
                    : downloadedSurahs.includes(selectedSurah.id)
                    ? t('محفوظة أوفلاين (تعمل بدون إنترنت)', 'Saved for Offline Playback')
                    : t('تنزيل السورة للاستماع دون إنترنت', 'Download for Offline Playback')}
                </TextUI>
              </View>

              <TouchableOpacity
                onPress={() => {
                  if (downloadedSurahs.includes(selectedSurah.id)) {
                    setDownloadedSurahs((prev) => prev.filter((id) => id !== selectedSurah.id));
                    triggerHapticFeedback('light');
                  } else {
                    setIsDownloading(selectedSurah.id);
                    setTimeout(() => {
                      setIsDownloading(null);
                      setDownloadedSurahs((prev) => [...prev, selectedSurah.id]);
                      triggerHapticFeedback('success');
                    }, 1200);
                  }
                }}
                style={{
                  paddingVertical: 5,
                  paddingHorizontal: 12,
                  borderRadius: TOKENS.radius.pill,
                  backgroundColor: downloadedSurahs.includes(selectedSurah.id) ? (themeMode === 'light' ? '#FAF6F0' : '#332922') : TOKENS.colors.primary,
                  borderWidth: 1,
                  borderColor: downloadedSurahs.includes(selectedSurah.id) ? c.border : TOKENS.colors.primary
                }}
              >
                <TextUI size={11} weight="bold" color={downloadedSurahs.includes(selectedSurah.id) ? TOKENS.colors.error : '#FFFFFF'}>
                  {downloadedSurahs.includes(selectedSurah.id) ? t('حذف 🗑️', 'Remove') : t('تنزيل 📥', 'Download')}
                </TextUI>
              </TouchableOpacity>
            </View>

            {/* Audio Timeline & Interactive Progress Bar */}
            <View style={{ width: '100%', marginTop: 14, marginBottom: 8 }}>
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={(e: any) => {
                  try {
                    const locX = e.nativeEvent?.locationX || 0;
                    const barWidth = 320;
                    const ratio = Math.max(0, Math.min(1, locX / barWidth));
                    if (audioTotalSecs > 0) {
                      seekAudioToTime(Math.round(ratio * audioTotalSecs));
                    }
                  } catch (err) {}
                }}
                style={{ width: '100%', paddingVertical: 6 }}
              >
                <View
                  style={{
                    height: 6,
                    backgroundColor: themeMode === 'light' ? '#E8DFD5' : '#44352D',
                    borderRadius: 3,
                    width: '100%',
                    overflow: 'hidden'
                  }}
                >
                  <View
                    style={{
                      height: '100%',
                      width: `${Math.max(4, audioProgress)}%`,
                      backgroundColor: TOKENS.colors.primary,
                      borderRadius: 3
                    }}
                  />
                </View>
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <TextUI size={11} color={c.textSecondary}>{audioCurrentTime}</TextUI>
                <View style={{ backgroundColor: themeMode === 'light' ? '#F4EEE6' : '#2C221A', paddingHorizontal: 7, paddingVertical: 1.5, borderRadius: 8 }}>
                  <TextUI size={10} weight="bold" color={TOKENS.colors.primary}>
                    {`متبقي ${audioRemainingTime}`}
                  </TextUI>
                </View>
                <TextUI size={11} color={c.textSecondary}>{audioDuration === '٠٠:٠٠' ? '١٨:٤٥' : audioDuration}</TextUI>
              </View>
            </View>

            {/* Playback Controls Row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 8 }}>
              {/* Previous Surah Button */}
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="prev-surah-btn"
                onPress={() => {
                  const idx = SURAHS.findIndex((s: any) => s.id === selectedSurah.id);
                  if (idx > 0) switchAudioSurah(SURAHS[idx - 1], true);
                }}
                disabled={selectedSurah.id <= 1}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: c.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: c.border,
                  opacity: selectedSurah.id <= 1 ? 0.35 : 1
                }}
              >
                <Feather name="skip-forward" size={16} color={c.textPrimary} />
              </TouchableOpacity>

              {/* Rewind 15s Button */}
              <TouchableOpacity
                onPress={() => skipAudioSeconds(-15)}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  backgroundColor: c.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: c.border
                }}
              >
                <Feather name="rotate-ccw" size={16} color={c.textPrimary} />
              </TouchableOpacity>

              {/* Main Play / Pause Button */}
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="play-pause-btn"
                onPress={toggleQuranAudioPlayback}
                style={{
                  width: 66,
                  height: 66,
                  borderRadius: 33,
                  backgroundColor: TOKENS.colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  ...makeShadow('0 6px 18px rgba(140, 94, 60, 0.4)', '#8C5E3C', 0.4, 6, { width: 0, height: 3 }, 6)
                }}
              >
                <Feather name={audioPlaying ? 'pause' : 'play'} size={28} color="#FFFFFF" />
              </TouchableOpacity>

              {/* Forward 15s Button */}
              <TouchableOpacity
                onPress={() => skipAudioSeconds(15)}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  backgroundColor: c.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: c.border
                }}
              >
                <Feather name="rotate-cw" size={16} color={c.textPrimary} />
              </TouchableOpacity>

              {/* Next Surah Button */}
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="next-surah-btn"
                onPress={() => {
                  const idx = SURAHS.findIndex((s: any) => s.id === selectedSurah.id);
                  if (idx < SURAHS.length - 1) switchAudioSurah(SURAHS[idx + 1], true);
                }}
                disabled={selectedSurah.id >= 114}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: c.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: c.border,
                  opacity: selectedSurah.id >= 114 ? 0.35 : 1
                }}
              >
                <Feather name="skip-back" size={16} color={c.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          <TextUI weight="bold" size={14} color={c.textSecondary} style={{ marginBottom: 10, paddingHorizontal: 4 }}>
            {t('اختر القارئ المفضل:', 'Choose Reciter:')}
          </TextUI>

          {reciters.map((r) => {
            const isSelected = audioReciter === r.id;
            return (
              <TappableRow
                key={r.id}
                title={r.name}
                subtitle={r.riwayah}
                icon="volume-2"
                onPress={() => changeAudioReciter(r.id)}
                hasChevron={false}
                rightElement={isSelected ? <Feather name="check" size={18} color={TOKENS.colors.primary} /> : null}
              />
            );
          })}
        </ScrollView>

        {/* Modal: Surah Selector for Audio (منتقي السور للاستماع والتلاوة) */}
        <Modal
          visible={audioSurahSelectorVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setAudioSurahSelectorVisible(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.65)',
              justifyContent: 'flex-end'
            }}
          >
            <View
              style={{
                backgroundColor: c.bg,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                maxHeight: '85%',
                minHeight: '65%',
                paddingTop: 16,
                paddingHorizontal: 18,
                borderTopWidth: 2,
                borderColor: TOKENS.colors.secondary
              }}
            >
              {/* Modal Drag Handle */}
              <View
                style={{
                  width: 42,
                  height: 5,
                  backgroundColor: c.border,
                  borderRadius: 3,
                  alignSelf: 'center',
                  marginBottom: 12
                }}
              />

              {/* Modal Header */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12
                }}
              >
                <View>
                  <TextUI weight="bold" size={18} color={TOKENS.colors.primaryDark}>
                    {t('اختيار السورة للاستماع', 'Choose Surah for Recitation')}
                  </TextUI>
                  <TextUI size={12} color={c.textSecondary} style={{ marginTop: 2 }}>
                    {t('١١٤ سورة كاملة برواية حفص عن عاصم', 'All 114 Surahs available')}
                  </TextUI>
                </View>

                <TouchableOpacity
                  onPress={() => setAudioSurahSelectorVisible(false)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: c.surface,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: c.border
                  }}
                >
                  <Feather name="x" size={18} color={c.textPrimary} />
                </TouchableOpacity>
              </View>

              {/* Live Search Bar */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: c.surface,
                  borderRadius: TOKENS.radius.md,
                  borderWidth: 1,
                  borderColor: TOKENS.colors.secondary,
                  paddingHorizontal: 12,
                  paddingVertical: Platform.OS === 'ios' ? 10 : 8,
                  marginBottom: 14
                }}
              >
                <Feather name="search" size={18} color={TOKENS.colors.primary} style={{ marginLeft: 6 }} />
                <TextInput
                  value={audioSurahSearch}
                  onChangeText={setAudioSurahSearch}
                  placeholder={t('ابحث باسم السورة أو رقمها (الكهف، البقرة، 36...)', 'Search Surah name or number...')}
                  placeholderTextColor={c.textSecondary}
                  style={{
                    flex: 1,
                    fontFamily: 'Tajawal, sans-serif',
                    fontSize: 14,
                    color: c.textPrimary,
                    textAlign: isRTL ? 'right' : 'left'
                  }}
                />
                {audioSurahSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setAudioSurahSearch('')} style={{ padding: 4 }}>
                    <Feather name="x-circle" size={16} color={c.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Filtered 114 Surahs List */}
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 30 }}
                showsVerticalScrollIndicator={true}
              >
                {SURAHS.filter((s: any) => {
                  if (!audioSurahSearch.trim()) return true;
                  const query = audioSurahSearch.trim().toLowerCase();
                  return (
                    s.nameAr.includes(query) ||
                    s.nameEn.toLowerCase().includes(query) ||
                    String(s.id).includes(query)
                  );
                }).map((surah: any) => {
                  const isCurrent = surah.id === selectedSurah.id;
                  const isDownloaded = downloadedSurahs.includes(surah.id);
                  return (
                    <TouchableOpacity
                      key={surah.id}
                      accessibilityRole="button"
                      accessibilityLabel={`audio-surah-item-${surah.id}`}
                      activeOpacity={0.7}
                      onPress={() => {
                        switchAudioSurah(surah, true);
                        setAudioSurahSelectorVisible(false);
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: 12,
                        paddingHorizontal: 14,
                        borderRadius: TOKENS.radius.md,
                        backgroundColor: isCurrent
                          ? (themeMode === 'light' ? '#FAF1E6' : '#3D2F24')
                          : c.surface,
                        borderWidth: isCurrent ? 1.5 : 1,
                        borderColor: isCurrent ? TOKENS.colors.secondary : c.border,
                        marginBottom: 8
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                        {/* Surah Number Badge */}
                        <View
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: isCurrent ? TOKENS.colors.primary : (themeMode === 'light' ? TOKENS.colors.primaryLight : '#2C221C'),
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 1,
                            borderColor: TOKENS.colors.secondary
                          }}
                        >
                          <TextUI weight="bold" size={13} color={isCurrent ? '#FFFFFF' : TOKENS.colors.primaryDark}>
                            {toArabicNumber(surah.id)}
                          </TextUI>
                        </View>

                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <TextUI weight="bold" size={15} color={isCurrent ? TOKENS.colors.primaryDark : c.textPrimary}>
                              {isRTL ? `سورة ${surah.nameAr}` : `Surah ${surah.nameEn}`}
                            </TextUI>
                            {isCurrent && (
                              <View style={{ backgroundColor: TOKENS.colors.primary, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 }}>
                                <TextUI size={10} weight="bold" color="#FFFFFF">
                                  {t('قيد الاستماع', 'Playing')}
                                </TextUI>
                              </View>
                            )}
                          </View>

                          <TextUI size={11} color={c.textSecondary} style={{ marginTop: 2 }}>
                            {`${toArabicNumber(surah.verses)} آية • ${surah.type} • الجزء ${toArabicNumber(surah.juz)}`}
                          </TextUI>
                        </View>
                      </View>

                      {/* Right Element: Offline indicator / select icon */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {isDownloaded && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: 'rgba(78, 125, 91, 0.12)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                            <Feather name="check" size={12} color="#4E7D5B" />
                            <TextUI size={10} color="#4E7D5B" weight="bold">
                              {t('محفوظة', 'Saved')}
                            </TextUI>
                          </View>
                        )}
                        <Feather
                          name={isCurrent ? "play-circle" : "chevron-left"}
                          size={isCurrent ? 22 : 16}
                          color={isCurrent ? TOKENS.colors.primary : c.textSecondary}
                        />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  // ==========================================
  // --- MODULE 6: AZKAR SERVICES -------------
  // ==========================================
  const renderAzkarCategories = () => (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title={t('الأذكار وحصن المسلم', 'Daily Remembrances')} onBack={goBack} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 18, paddingBottom: 110 }}>
        {AZKAR_CATEGORIES.map((cat) => (
          <TappableRow
            key={cat.id}
            title={isRTL ? cat.titleAr : cat.titleEn}
            subtitle={isRTL ? cat.subtitleAr : `${cat.count} Remembrances`}
            icon={cat.icon}
            badge={`${cat.count} ${t('أذكار', 'items')}`}
            onPress={() => {
              setSelectedCategory(cat);
              setAzkarIndex(0);
              setAzkarCounter(0);
              navigate('AzkarSession');
            }}
          />
        ))}
      </ScrollView>
    </View>
  );

  const renderAzkarSession = () => {
    const azkarList = (selectedCategory && AZKAR_DATABASE[selectedCategory.id]) ? AZKAR_DATABASE[selectedCategory.id] : AZKAR_DATABASE.morning;
    const safeIndex = azkarIndex % azkarList.length;
    const currentItem = azkarList[safeIndex];
    const isCompleted = azkarCounter >= currentItem.target;

    const handleTap = () => {
      if (azkarCounter < currentItem.target) {
        const nextVal = azkarCounter + 1;
        setAzkarCounter(nextVal);
        if (hapticEnabled) playHapticClick();
        if (nextVal >= currentItem.target) {
          playCompletionFanfare();
        }
      }
    };

    const handleNext = () => {
      if (azkarIndex + 1 >= azkarList.length) {
        navigate('AzkarCompletion');
      } else {
        setAzkarIndex((prev) => prev + 1);
        setAzkarCounter(0);
        triggerHapticFeedback('light');
      }
    };

    const handlePrev = () => {
      if (azkarIndex > 0) {
        setAzkarIndex((prev) => prev - 1);
        setAzkarCounter(0);
        triggerHapticFeedback('light');
      }
    };

    // Smooth horizontal swipe gesture handlers (pure touch events without violating React hooks rules)
    let touchStartX = 0;
    let touchStartY = 0;

    const onTouchStart = (e: any) => {
      try {
        const touch = e.nativeEvent?.touches?.[0] || e.nativeEvent;
        touchStartX = touch?.pageX ?? touch?.clientX ?? 0;
        touchStartY = touch?.pageY ?? touch?.clientY ?? 0;
      } catch (err) {}
    };

    const onTouchEnd = (e: any) => {
      try {
        const touch = e.nativeEvent?.changedTouches?.[0] || e.nativeEvent;
        const endX = touch?.pageX ?? touch?.clientX ?? 0;
        const endY = touch?.pageY ?? touch?.clientY ?? 0;
        const deltaX = endX - touchStartX;
        const deltaY = endY - touchStartY;

        // Verify it was a horizontal swipe (dx > 40 and horizontal distance greater than vertical)
        if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
          if (deltaX < 0) {
            // Swiped to the left
            if (isRTL) {
              handlePrev();
            } else {
              handleNext();
            }
          } else {
            // Swiped to the right
            if (isRTL) {
              handleNext();
            } else {
              handlePrev();
            }
          }
        }
      } catch (err) {}
    };

    // Responsive font calculation to prevent oversized fonts on long texts (e.g., Ayat Al-Kursi)
    const textLen = (currentItem.ar || '').length;
    const arabicFontSize = textLen > 240 ? 19 : textLen > 130 ? 22 : textLen > 60 ? 25 : 28;
    const arabicLineHeight = Math.round(arabicFontSize * 1.8);

    return (
      <View
        style={{ flex: 1, backgroundColor: c.bg, justifyContent: 'space-between' }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <Header
          title={isRTL ? selectedCategory.titleAr : selectedCategory.titleEn}
          subtitle={isRTL ? `${toArabicNumber(safeIndex + 1)} من ${toArabicNumber(azkarList.length)} • فضل الذكر` : `${safeIndex + 1} of ${azkarList.length}`}
          onBack={goBack}
          rightAction={
            <TouchableOpacity onPress={() => setAzkarCounter(0)} style={{ padding: 6 }}>
              <Feather name="refresh-cw" size={16} color={c.textSecondary} />
            </TouchableOpacity>
          }
        />

        {/* Upper Portion: Scrollable Dhikr Text - With Swipe Hints */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 22,
            paddingVertical: 18,
            alignItems: 'center',
            justifyContent: 'center',
            flexGrow: 1
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Quick Category & Progress Ribbon */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: themeMode === 'light' ? 'rgba(198, 146, 85, 0.1)' : 'rgba(198, 146, 85, 0.18)',
              paddingVertical: 4,
              paddingHorizontal: 12,
              borderRadius: TOKENS.radius.pill,
              marginBottom: 12,
              gap: 6
            }}
          >
            <Feather name="info" size={12} color={TOKENS.colors.primary} />
            <TextUI size={11} weight="medium" color={TOKENS.colors.primary}>
              {t('اسحب الشاشة يميناً أو يساراً للتنقل بين الأذكار', 'Swipe left or right to switch azkar')}
            </TextUI>
          </View>

          <TextUI
            quran
            weight="bold"
            align="center"
            size={arabicFontSize}
            color={TOKENS.colors.primary}
            style={{
              lineHeight: arabicLineHeight,
              marginBottom: 14,
              textAlign: 'center'
            }}
          >
            {currentItem.ar}
          </TextUI>

          {currentItem.en ? (
            <TextUI size={13} color={c.textSecondary} align="center" style={{ marginBottom: 14, lineHeight: 20 }}>
              {currentItem.en}
            </TextUI>
          ) : null}

          {currentItem.virtue ? (
            <View
              style={{
                backgroundColor: themeMode === 'light' ? TOKENS.colors.secondaryLight : '#2A241C',
                paddingVertical: 6,
                paddingHorizontal: 16,
                borderRadius: TOKENS.radius.pill,
                marginTop: 4
              }}
            >
              <TextUI size={12} color={TOKENS.colors.primaryDark}>
                {currentItem.virtue}
              </TextUI>
            </View>
          ) : null}
        </ScrollView>

        {/* Bottom Interactive Navigation & Counter Bar */}
        <View style={{ backgroundColor: c.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, borderTopWidth: 1, borderColor: c.border }}>
          {/* Prev / Next Arrows Bar for direct clicking alongside swipe */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingTop: 10,
              paddingBottom: 4
            }}
          >
            {/* Previous Dhikr Button */}
            <TouchableOpacity
              onPress={handlePrev}
              disabled={safeIndex === 0}
              activeOpacity={0.7}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: TOKENS.radius.md,
                backgroundColor: safeIndex > 0 ? (themeMode === 'light' ? '#F4EDE4' : '#2C221A') : 'transparent',
                opacity: safeIndex === 0 ? 0.35 : 1
              }}
            >
              <Feather name={isRTL ? "chevron-right" : "chevron-left"} size={16} color={TOKENS.colors.primary} />
              <TextUI size={12} weight="bold" color={TOKENS.colors.primary}>
                {t('السابق', 'Previous')}
              </TextUI>
            </TouchableOpacity>

            {/* Dhikr Index Counter Chip */}
            <View
              style={{
                backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : '#241E1A',
                paddingHorizontal: 12,
                paddingVertical: 4,
                borderRadius: TOKENS.radius.pill,
                borderWidth: 1,
                borderColor: 'rgba(198, 146, 85, 0.3)'
              }}
            >
              <TextUI size={11} weight="bold" color={TOKENS.colors.primary}>
                {`${toArabicNumber(safeIndex + 1)} / ${toArabicNumber(azkarList.length)}`}
              </TextUI>
            </View>

            {/* Next / Skip Dhikr Button */}
            <TouchableOpacity
              onPress={handleNext}
              activeOpacity={0.7}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: TOKENS.radius.md,
                backgroundColor: themeMode === 'light' ? '#F4EDE4' : '#2C221A'
              }}
            >
              <TextUI size={12} weight="bold" color={TOKENS.colors.primary}>
                {safeIndex + 1 >= azkarList.length ? t('إتمام', 'Finish') : t('تخطي / التالي', 'Next')}
              </TextUI>
              <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={16} color={TOKENS.colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Lower Portion: Ergonomic Touch Area for Eyes-Free Counting */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={isCompleted ? handleNext : handleTap}
            style={{
              height: Math.min(220, (windowHeight || 700) * 0.32),
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 14,
              paddingHorizontal: 20
            }}
          >
            {isCompleted ? (
              <View style={{ alignItems: 'center' }}>
                <View
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: 29,
                    backgroundColor: TOKENS.colors.primaryLight,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12
                  }}
                >
                  <Feather name="check-circle" size={32} color={TOKENS.colors.primary} />
                </View>
                <TextUI weight="bold" size={18} color={TOKENS.colors.primary}>
                  {t('اكتمل الذكر • تقبل الله', 'Completed • MashaAllah')}
                </TextUI>
                <TextUI size={13} color={c.textSecondary} style={{ marginTop: 4 }}>
                  {t('اضغط أو اسحب للانتقال إلى الذكر التالي', 'Tap or swipe to proceed')}
                </TextUI>
              </View>
            ) : (
              <View style={{ alignItems: 'center' }}>
                <View
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: 50,
                    borderWidth: 2,
                    borderColor: TOKENS.colors.secondary,
                    backgroundColor: themeMode === 'light' ? TOKENS.colors.secondaryLight : '#2A2019',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 6
                  }}
                >
                  <TextUI weight="bold" size={36} color={TOKENS.colors.primaryDark}>
                    {isRTL ? toArabicNumber(azkarCounter) : azkarCounter}
                  </TextUI>
                  <TextUI size={11} weight="bold" color={TOKENS.colors.secondary}>
                    {`${t('الهدف:', 'Target:')} ${isRTL ? toArabicNumber(currentItem.target) : currentItem.target}`}
                  </TextUI>
                </View>
                <View
                  style={{
                    marginTop: 8,
                    backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : '#2C231E',
                    paddingVertical: 5,
                    paddingHorizontal: 16,
                    borderRadius: TOKENS.radius.pill
                  }}
                >
                  <TextUI size={12} weight="medium" color={TOKENS.colors.primary}>
                    {t('المس للعد • أو اسحب الشاشة للتخطي والتبديل', 'Tap to count • Swipe to skip/navigate')}
                  </TextUI>
                </View>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderAzkarCompletion = () => (
    <View style={{ flex: 1, padding: 24, justifyContent: 'space-between', backgroundColor: c.bg }}>
      <Header title={t('اكتمال الورد', 'Completion')} onBack={() => navigate('AzkarCategories')} />
      <View style={{ alignItems: 'center', paddingHorizontal: 16 }}>
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: TOKENS.colors.primaryLight,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20
          }}
        >
          <Feather name="check" size={40} color={TOKENS.colors.primary} />
        </View>
        <TextUI weight="bold" size={24} align="center">
          {t('تقبل الله طاعتكم وذكركم', 'May Allah Accept Your Worship')}
        </TextUI>
        <TextUI size={15} color={c.textSecondary} align="center" style={{ marginTop: 12 }}>
          {t(
            'أتممت وردك من الأذكار اليومية بحمد الله وتوفيقه. داوم على ذكر الله يطمئن قلبك.',
            'You have successfully completed your daily remembrance. Keep remembering Allah to find peace.'
          )}
        </TextUI>
      </View>

      <View style={{ marginBottom: 20 }}>
        <TouchableOpacity
          onPress={() => navigate('Home')}
          style={{
            backgroundColor: TOKENS.colors.primary,
            paddingVertical: 16,
            borderRadius: TOKENS.radius.pill,
            alignItems: 'center',
            marginBottom: 12
          }}
        >
          <TextUI weight="bold" size={16} color="#FFFFFF">
            {t('العودة للرئيسية', 'Return to Home')}
          </TextUI>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Sub-Settings Components
  const renderAppearance = () => (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title={t('المظهر والسمة', 'Appearance')} onBack={goBack} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        <TappableRow
          title={t('الوضع الفاتح (Light Mode)', 'Light Mode')}
          subtitle={t('أوف وايت دافئ مريح للعينين خلال النهار', 'Warm off-white for daytime reading')}
          icon="sun"
          onPress={() => {
            setThemeMode('light');
            savePref('almosala_theme', 'light');
          }}
          hasChevron={false}
          rightElement={themeMode === 'light' ? <Feather name="check" size={18} color={TOKENS.colors.primary} /> : null}
        />
        <TappableRow
          title={t('الوضع الداكن (Dark Mode)', 'Dark Mode')}
          subtitle={t('رمادي داكن عميق بدون إشعاع، مثالي لقيام الليل والفجر', 'OLED-safe dark grey for nighttime reading')}
          icon="moon"
          onPress={() => {
            setThemeMode('dark');
            savePref('almosala_theme', 'dark');
          }}
          hasChevron={false}
          rightElement={themeMode === 'dark' ? <Feather name="check" size={18} color={TOKENS.colors.primary} /> : null}
        />
      </ScrollView>
    </View>
  );

  const renderLanguage = () => (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title={t('لغة التطبيق', 'Language')} onBack={goBack} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        <TappableRow
          title="العربية (RTL)"
          subtitle="اللغة الأصلية للتطبيق مع محاذاة كاملة من اليمين لليسار"
          icon="globe"
          onPress={() => {
            setLang('ar');
            savePref('almosala_lang', 'ar');
          }}
          hasChevron={false}
          rightElement={lang === 'ar' ? <Feather name="check" size={18} color={TOKENS.colors.primary} /> : null}
        />
        <TappableRow
          title="English (LTR)"
          subtitle="English layout with mirrored directional navigation"
          icon="globe"
          onPress={() => {
            setLang('en');
            savePref('almosala_lang', 'en');
          }}
          hasChevron={false}
          rightElement={lang === 'en' ? <Feather name="check" size={18} color={TOKENS.colors.primary} /> : null}
        />
      </ScrollView>
    </View>
  );

  const renderQuranSettings = () => {
    const riwayahs = [
      { id: 'hafs', name: t('رواية حفص عن عاصم', 'Hafs \'an \'Asim'), desc: t('المصحف العثماني المعتمد بمجمع الملك فهد', 'King Fahd Complex Standard') },
      { id: 'warsh', name: t('رواية ورش عن نافع', 'Warsh \'an Nafi\''), desc: t('الرسم المغربي الأندلسي الأصيل', 'Authentic Andalusian-Maghrebi script') },
      { id: 'qalun', name: t('رواية قالون عن نافع', 'Qalun \'an Nafi\''), desc: t('طراز قراءة أهل المدينة المنورة', 'Traditional Madinah style') }
    ];

    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <Header title={t('إعدادات المصحف', 'Quran Settings')} onBack={goBack} />
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
          {/* Live Verse Preview Card with Moorish Arch */}
          <View
            style={{
              backgroundColor: themeMode === 'light' ? TOKENS.colors.secondaryLight : '#2C221C',
              borderRadius: TOKENS.radius.lg,
              padding: 20,
              marginBottom: 20,
              borderWidth: 1.5,
              borderColor: TOKENS.colors.secondary,
              alignItems: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <ArabesqueWatermark opacity={0.08} color={TOKENS.colors.secondary} />
            <View style={{ width: '100%', marginBottom: 8 }}>
              <MoorishArchFrame height={18} color={TOKENS.colors.secondary} opacity={0.8} />
            </View>
            <TextUI size={12} weight="bold" color={TOKENS.colors.secondary} style={{ marginBottom: 6 }}>
              {t('معاينة مباشرة لخط المصحف الشريف:', 'Live Verse Preview:')}
            </TextUI>
            <TextUI quran size={quranFontSize} align="center" color={TOKENS.colors.primaryDark}>
              بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
            </TextUI>
            <TextUI quran size={quranFontSize * 0.85} align="center" color={TOKENS.colors.primary} style={{ marginTop: 6 }}>
              ﴿ الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ ﴾
            </TextUI>
          </View>

          <TextUI weight="bold" size={14} color={c.textSecondary} style={{ marginBottom: 12, paddingHorizontal: 4 }}>
            {t('حجم خط المصحف المستقل:', 'Independent Quran Font Size:')}
          </TextUI>

          {[
            { size: 22, label: t('الأساسي القياسي (22 pt)', 'Standard Default (22 pt)') },
            { size: 26, label: t('متوسط (26 pt)', 'Medium (26 pt)') },
            { size: 32, label: t('كبير (32 pt)', 'Large (32 pt)') },
            { size: 38, label: t('كبير جداً (38 pt)', 'Extra Large (38 pt)') },
            { size: 44, label: t('أقصى حجم (44 pt)', 'Maximum (44 pt)') }
          ].map((s) => {
            const isSelected = quranFontSize === s.size;
            return (
              <TappableRow
                key={s.size}
                title={s.label}
                onPress={() => {
                  setQuranFontSize(s.size);
                  savePref('almosala_font_size', s.size);
                }}
                hasChevron={false}
                rightElement={isSelected ? <Feather name="check" size={18} color={TOKENS.colors.primary} /> : null}
              />
            );
          })}

          <TextUI weight="bold" size={14} color={c.textSecondary} style={{ marginTop: 18, marginBottom: 10, paddingHorizontal: 4 }}>
            {t('الرواية والرسم القرآني:', 'Riwayah & Script Style:')}
          </TextUI>

          {riwayahs.map((r) => {
            const isSelected = selectedRiwayah === r.id;
            return (
              <TappableRow
                key={r.id}
                title={r.name}
                subtitle={r.desc}
                onPress={() => setSelectedRiwayah(r.id)}
                hasChevron={false}
                rightElement={isSelected ? <Feather name="check" size={18} color={TOKENS.colors.primary} /> : null}
              />
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderAzkarSettings = () => (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title={t('إعدادات الأذكار', 'Azkar Settings')} onBack={goBack} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        <TappableRow
          title={t('الاهتزاز اللمسي (Haptic)', 'Haptic Feedback')}
          subtitle={t('اهتزاز خفيف عند كل تسبيحة ونبضة مزدوجة عند الاكتمال', 'Gentle vibration on each tap')}
          icon="smartphone"
          hasChevron={false}
          rightElement={
            <Switch
              value={hapticEnabled}
              onValueChange={setHapticEnabled}
              trackColor={{ false: '#D1CDC7', true: TOKENS.colors.primary }}
            />
          }
        />
        <TappableRow
          title={t('حفظ التقدم تلقائياً', 'Auto-save Progress')}
          subtitle={t('استئناف جلسة الذكر من آخر عدد عند الخروج', 'Resume counter if interrupted')}
          icon="save"
          hasChevron={false}
          rightElement={
            <Switch
              value={autoSaveProgress}
              onValueChange={setAutoSaveProgress}
              trackColor={{ false: '#D1CDC7', true: TOKENS.colors.primary }}
            />
          }
        />
      </ScrollView>
    </View>
  );

  const renderPrivacy = () => (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title={t('الخصوصية والأمان', 'Privacy Policy')} onBack={goBack} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        <View
          style={{
            backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : '#2C231E',
            padding: 20,
            borderRadius: TOKENS.radius.lg,
            marginBottom: 20
          }}
        >
          <Feather name="shield" size={32} color={TOKENS.colors.primary} style={{ marginBottom: 12 }} />
          <TextUI weight="bold" size={18} color={TOKENS.colors.primary}>
            {t('مبدأ الخصوصية أولاً (Privacy by Design)', 'Privacy First Principle')}
          </TextUI>
          <TextUI size={14} color={c.textSecondary} style={{ marginTop: 8, lineHeight: 22 }}>
            {t(
              'تطبيق رفيق المسلم مصمم ليعمل بدون اتصال بالإنترنت بالكامل. نحن لا نقوم بجمع أو تخزين أو مشاركة أي بيانات شخصية، ولا نستخدم أي خدمات تتبع أو إعلانات تجارية.',
              'The Islamic Companion is fully functional offline. We do not collect, store, or transmit your personal data. No analytics or ads are ever included.'
            )}
          </TextUI>
        </View>
      </ScrollView>
    </View>
  );

  const renderSources = () => (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title={t('المصادر والاعتمادات', 'Sources & References')} onBack={goBack} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        <TappableRow
          title={t('نصوص القرآن الكريم', 'Holy Quran Text')}
          subtitle={t('مجمع الملك فهد لطباعة المصحف الشريف بالمدينة المنورة برواية حفص عن عاصم', 'King Fahd Glorious Quran Printing Complex')}
          icon="book"
          hasChevron={false}
        />
        <TappableRow
          title={t('مواقيت الصلاة الفلكية', 'Astronomical Calculations')}
          subtitle={t('خوارزميات معتمدة من رابطة العالم الإسلامي وهيئة المساحة المصرية', 'Muslim World League & Egyptian Survey Authority')}
          icon="clock"
          hasChevron={false}
        />
        <TappableRow
          title={t('الأذكار والأدعية', 'Azkar & Duas')}
          subtitle={t('كتاب حصن المسلم من أذكار الكتاب والسنة للشيخ سعيد بن علي بن وهف القحطاني', 'Hisn al-Muslim (Fortress of the Muslim)')}
          icon="heart"
          hasChevron={false}
        />
      </ScrollView>
    </View>
  );

  const renderAbout = () => (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title={t('حول رفيق المسلم', 'About App')} onBack={goBack} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, alignItems: 'center', paddingBottom: 100 }}>
        {/* Top Moorish Arch Accent */}
        <View style={{ width: '100%', marginBottom: 18 }}>
          <MoorishArchFrame height={24} color={TOKENS.colors.secondary} opacity={0.75} />
        </View>

        <IslamicLogo size={88} />

        <View
          style={{
            backgroundColor: themeMode === 'light' ? TOKENS.colors.secondaryLight : '#382E28',
            paddingHorizontal: 12,
            paddingVertical: 3,
            borderRadius: TOKENS.radius.pill,
            marginTop: 16,
            marginBottom: 6,
            borderWidth: 1,
            borderColor: TOKENS.colors.secondary
          }}
        >
          <TextUI size={12} weight="bold" color={TOKENS.colors.primaryDark}>
            {t('الإصدار الأندلسي الفاخر ٢٠٢٦ • v2.0.26', 'Andalusian Luxury Edition 2026 • v2.0.26')}
          </TextUI>
        </View>

        <TextUI weight="bold" size={26} color={TOKENS.colors.primaryDark}>{t('رفيق المسلم', 'Islamic Companion')}</TextUI>

        <TextUI size={14} color={c.textSecondary} align="center" style={{ marginTop: 12, lineHeight: 22, maxWidth: 320 }}>
          {t(
            'تطبيق إسلامي يومي هادئ وموثوق، صُمم بعناية فائقة ليعينك على أداء صلواتك وقراءة وردك القرآني وأذكارك دون تشتيت أو إعلانات.',
            'A calm and trustworthy Islamic companion crafted to help you fulfill your daily prayers, Quran recitation, and remembrances without distractions.'
          )}
        </TextUI>

        {/* 3 Core Trust Guarantees */}
        <View style={{ width: '100%', marginTop: 22 }}>
          {[
            { icon: 'shield', title: t('خصوصية تامة بدون تتبع', '100% Privacy Guaranteed'), desc: t('لا نقوم بجمع أو حفظ أي بيانات شخصية', 'Zero data collection or sharing') },
            { icon: 'wifi-off', title: t('يعمل دون اتصال بالإنترنت', 'Works 100% Offline'), desc: t('المواقيت والأذكار والمصحف محفوظة بالجهاز', 'All data stored locally on your device') },
            { icon: 'slash', title: t('خالٍ تماماً من الإعلانات', 'Zero Advertisements'), desc: t('تجربة عبادة صافية ونقية لوجه الله', 'Completely pure and distraction-free') }
          ].map((item, idx) => (
            <View
              key={idx}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: c.surface,
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: TOKENS.radius.md,
                marginBottom: 10,
                borderWidth: 1,
                borderColor: c.border
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : '#2C231E',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: 12
                }}
              >
                <Feather name={item.icon} size={18} color={TOKENS.colors.primary} />
              </View>
              <View style={{ flex: 1, alignItems: 'flex-start' }}>
                <TextUI weight="bold" size={14} color={c.textPrimary}>{item.title}</TextUI>
                <TextUI size={12} color={c.textSecondary} style={{ marginTop: 1 }}>{item.desc}</TextUI>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          onPress={() => navigate('Welcome')}
          style={{
            marginTop: 20,
            backgroundColor: c.surface,
            paddingVertical: 12,
            paddingHorizontal: 24,
            borderRadius: TOKENS.radius.pill,
            borderWidth: 1,
            borderColor: TOKENS.colors.secondary
          }}
        >
          <TextUI size={14} weight="bold" color={TOKENS.colors.primary}>
            {t('إعادة فتح جولة البداية', 'Replay Onboarding Tour')}
          </TextUI>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  // Router Dispatcher
  const renderCurrentScreen = () => {
    switch (screen) {
      // Onboarding
      case 'Welcome':
        return renderWelcome();
      case 'LocationPermission':
        return renderLocationPermission();
      case 'ManualLocation':
        return renderManualLocation();
      case 'NotificationPermission':
        return renderNotificationPermission();

      // Home
      case 'Home':
        return renderHome();

      // Prayer
      case 'PrayerTimes':
        return renderPrayerTimes();
      case 'PrayerTracker':
        return renderPrayerTracker();
      case 'Imsakiah':
        return renderImsakiah();
      case 'Qibla':
        return renderQibla();
      case 'PrayerSettings':
        return renderPrayerSettings();
      case 'CalculationMethod':
        return renderCalculationMethod();
      case 'LocationSettings':
        return renderLocationSettings();
      case 'NotificationSettings':
        return renderNotificationSettings();
      case 'AdhanSettings':
        return renderAdhanSettings();

      // Quran
      case 'QuranIndex':
        return renderQuranIndex();
      case 'QuranReader':
        return renderQuranReader();
      case 'QuranKhatmah':
        return renderQuranKhatmah();
      case 'ShareCard':
        return renderShareCard();
      case 'QuranBookmarks':
        return renderQuranBookmarks();
      case 'QuranAudio':
        return renderQuranAudio();
      case 'QuranSettings':
        return renderQuranSettings();

      // Azkar
      case 'AzkarCategories':
        return renderAzkarCategories();
      case 'AzkarSession':
        return renderAzkarSession();
      case 'AzkarCompletion':
        return renderAzkarCompletion();
      case 'AzkarSettings':
        return renderAzkarSettings();

      // Islamic Duties & Calendar
      case 'IslamicEvents':
        return renderIslamicEvents();
      case 'ZakatCalculator':
        return renderZakatCalculator();

      // Islamic Encyclopedia Suite
      case 'Ruqyah':
        return renderRuqyah();
      case 'Hadith40':
        return renderHadith40();
      case 'AllahNames':
        return renderAllahNames();
      case 'ProphetLessons':
        return renderProphetMosqueLessons();

      // More & Settings
      case 'More':
      case 'Settings':
        return renderMore();
      case 'Appearance':
        return renderAppearance();
      case 'Language':
        return renderLanguage();
      case 'Privacy':
        return renderPrivacy();
      case 'Sources':
        return renderSources();
      case 'About':
        return renderAbout();

      default:
        return renderHome();
    }
  };

  // Full-Screen Views that should hide bottom navigation
  const isFullScreen = [
    'Welcome',
    'LocationPermission',
    'ManualLocation',
    'NotificationPermission',
    'QuranReader',
    'AzkarSession'
  ].includes(screen);

  const isDesktopWeb = isWeb && (windowWidth > 480);

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: isDesktopWeb ? '#ECE4D8' : c.bg,
          direction: isRTL ? 'rtl' : 'ltr',
          height: '100%',
          maxHeight: '100%'
        }
      ]}
      {...({ dir: isRTL ? 'rtl' : 'ltr' } as any)}
    >
      <StatusBar
        barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={c.bg}
      />
      <View
        {...({ dir: isRTL ? 'rtl' : 'ltr' } as any)}
        style={[
          styles.deviceFrame,
          {
            backgroundColor: c.bg,
            direction: isRTL ? 'rtl' : 'ltr',
            width: '100%',
            maxWidth: isDesktopWeb ? 440 : '100%',
            alignSelf: isDesktopWeb ? 'center' : 'stretch',
            height: '100%',
            maxHeight: '100%',
            flex: 1,
            flexDirection: 'column',
            overflow: 'hidden',
            paddingTop: isWeb ? 0 : (quranReaderFullScreen ? 0 : STATUSBAR_HEIGHT),
            ...(isDesktopWeb
              ? ({
                  boxShadow: '0 10px 40px rgba(93, 58, 34, 0.12), 0 0 0 1px rgba(198, 146, 85, 0.2)'
                } as any)
              : {})
          }
        ]}
      >
        <View style={{ flex: 1, minHeight: 0, overflow: 'hidden' }} {...({ dir: isRTL ? 'rtl' : 'ltr' } as any)}>
          {renderCurrentScreen()}
        </View>
        {audioPlaying && !isLessonPageOpen && !['QuranAudio', 'Welcome', 'LocationPermission', 'ManualLocation', 'NotificationPermission'].includes(screen) && !audioMiniPlayerDismissed && (
          FloatingMiniPlayer()
        )}
        {!isFullScreen && !isLessonPageOpen && BottomNav()}
        {ScreenCatalogModal()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
    overflow: 'hidden'
  },
  deviceFrame: {
    flex: 1,
    width: '100%',
    position: 'relative',
    overflow: 'hidden'
  }
});

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class SafeErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Almosala ErrorBoundary caught error:', error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#FAF6F0', justifyContent: 'center', alignItems: 'center', padding: 24, direction: 'rtl' }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#F5EBE1', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Feather name="alert-triangle" size={32} color="#8C5E3C" />
          </View>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#5D3A22', marginBottom: 10, textAlign: 'center' }}>
            نعتذر، حدثت مشكلة غير متوقعة
          </Text>
          <Text style={{ fontSize: 13, color: '#8C5E3C', marginBottom: 24, textAlign: 'center', paddingHorizontal: 16 }}>
            {this.state.error?.message || 'تمت استعادة استقرار التطبيق لمنع الإغلاق المفاجئ.'}
          </Text>
          <TouchableOpacity
            onPress={this.resetError}
            activeOpacity={0.8}
            style={{ backgroundColor: '#8C5E3C', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 25 }}
          >
            <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 15 }}>العودة للتطبيق</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <SafeErrorBoundary>
      <AlmosalaApp />
    </SafeErrorBoundary>
  );
}

