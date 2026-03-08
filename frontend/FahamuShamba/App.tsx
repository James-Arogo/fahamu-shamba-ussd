import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
  Dimensions,
  ActivityIndicator
} from 'react-native';

const { width, height } = Dimensions.get('window');

// Types
type Language = 'english' | 'swahili' | 'luo';
type SubCounty = 'bondo' | 'ugunja' | 'yala' | 'gem' | 'alego';
type SoilType = 'sandy' | 'clay' | 'loam';
type Season = 'long_rains' | 'short_rains' | 'dry';

// Translations
const translations = {
  english: {
    welcome: 'Welcome to Fahamu Shamba',
    tagline: 'AI-Powered Crop Prediction for Farmers',
    selectLanguage: 'Choose Your Language',
    getStarted: 'Get Started',
    subCounty: 'Select Sub-County',
    soilType: 'Soil Type',
    season: 'Season',
    predict: 'Get Prediction',
    recommendation: 'We Recommend',
    confidence: 'Confidence',
    reason: 'Reason',
    feedback: 'Was this helpful?',
    yes: 'Yes',
    no: 'No',
    back: 'Back',
    tryAgain: 'Try Again',
    loading: 'Analyzing your farm...',
    error: 'Connection Error',
    errorMessage: 'Please check your connection and try again'
  },
  swahili: {
    welcome: 'Karibu Fahamu Shamba',
    tagline: 'Utabiri wa Mazao kwa Wakulima',
    selectLanguage: 'Chagua Lugha Yako',
    getStarted: 'Anza',
    subCounty: 'Chagua Sub-Kaunti',
    soilType: 'Aina ya Udongo',
    season: 'Msimu',
    predict: 'Pata Utabiri',
    recommendation: 'Tunapendekeza',
    confidence: 'Uhakika',
    reason: 'Sababu',
    feedback: 'Ilikuwa msaada?',
    yes: 'Ndio',
    no: 'Hapana',
    back: 'Rudi',
    tryAgain: 'Jaribu Tena',
    loading: 'Inachambua shamba lako...',
    error: 'Hitilafu ya Muunganisho',
    errorMessage: 'Tafadhali angalia muunganisho wako na ujaribu tena'
  },
  luo: {
    welcome: 'Ber e Fahamu Shamba',
    tagline: 'Kito ma nyiso kit ma idwaro tiyo',
    selectLanguage: 'Yier Dho',
    getStarted: 'Cakore',
    subCounty: 'Yier Sub-County',
    soilType: 'Tongo',
    season: 'Piny',
    predict: 'Nong\'o Kito',
    recommendation: 'Waneno ni',
    confidence: 'Geno',
    reason: 'Mano',
    feedback: 'Keto konyo?',
    yes: 'Eyo',
    no: 'Dagi',
    back: 'Dog',
    tryAgain: 'Tem kendo',
    loading: 'I donjo paro e puodhi...',
    error: 'Keto ma ok ber',
    errorMessage: 'Tem ber kony kendo i time'
  }
};

const subCounties = [
  { id: 'bondo', name: { english: 'Bondo', swahili: 'Bondo', luo: 'Bondo' } },
  { id: 'ugunja', name: { english: 'Ugunja', swahili: 'Ugunja', luo: 'Ugunja' } },
  { id: 'yala', name: { english: 'Yala', swahili: 'Yala', luo: 'Yala' } },
  { id: 'gem', name: { english: 'Gem', swahili: 'Gem', luo: 'Gem' } },
  { id: 'alego', name: { english: 'Alego', swahili: 'Alego', luo: 'Alego' } }
];

const soilTypes = [
  { id: 'sandy', name: { english: 'Sandy Soil', swahili: 'Udongo wa Mchanga', luo: 'Tongo Anyong' } },
  { id: 'clay', name: { english: 'Clay Soil', swahili: 'Udongo wa Mfinyanzi', luo: 'Tongo Lal' } },
  { id: 'loam', name: { english: 'Loam Soil', swahili: 'Udongo wa Tanuri', luo: 'Tongo Ber' } }
];

const seasons = [
  { id: 'long_rains', name: { english: 'Long Rains', swahili: 'Mvua Nyingi', luo: 'Piny Ruodho' } },
  { id: 'short_rains', name: { english: 'Short Rains', swahili: 'Mvua Fupi', luo: 'Piny Ruodho Machon' } },
  { id: 'dry', name: { english: 'Dry Season', swahili: 'Msimu wa Kiangazi', luo: 'Piny Kwo' } }
];

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'language' | 'input' | 'result'>('language');
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('english');
  const [selectedSubCounty, setSelectedSubCounty] = useState<SubCounty | null>(null);
  const [selectedSoilType, setSelectedSoilType] = useState<SoilType | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [prediction, setPrediction] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const t = translations[selectedLanguage];

  const handleLanguageSelect = (language: Language) => {
    setSelectedLanguage(language);
    setCurrentScreen('input');
  };

  const handlePredict = async () => {
    if (!selectedSubCounty || !selectedSoilType || !selectedSeason) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      // Use your deployed backend URL
      // For Vercel: https://your-vercel-domain.com/api/predict
      // For local testing: http://localhost:5000/api/predict
      // For Android local network: http://192.168.x.x:5000/api/predict
      const API_URL = 'http://localhost:5000/api/predict';
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subCounty: selectedSubCounty,
          soilType: selectedSoilType,
          season: selectedSeason,
          language: selectedLanguage
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setPrediction(data);
        setCurrentScreen('result');
      } else {
        Alert.alert(t.error, data.message || t.errorMessage);
      }
    } catch (error) {
      console.error('Prediction error:', error);
      Alert.alert(
        t.error, 
        t.errorMessage,
        [
          { text: 'OK', style: 'cancel' },
          { text: 'Try Again', onPress: handlePredict }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = (isHelpful: boolean) => {
    Alert.alert('Thank You', 'Thanks for your feedback!');
    resetForm();
  };

  const resetForm = () => {
    setCurrentScreen('input');
    setSelectedSubCounty(null);
    setSelectedSoilType(null);
    setSelectedSeason(null);
    setPrediction(null);
  };

  const renderLanguageScreen = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🌱 Fahamu Shamba</Text>
        <Text style={styles.subtitle}>{t.tagline}</Text>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>{t.selectLanguage}</Text>
        
        <TouchableOpacity 
          style={styles.languageButton}
          onPress={() => handleLanguageSelect('english')}
        >
          <Text style={styles.languageText}>🇬🇧 English</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.languageButton}
          onPress={() => handleLanguageSelect('swahili')}
        >
          <Text style={styles.languageText}>🇰🇪 Kiswahili</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.languageButton}
          onPress={() => handleLanguageSelect('luo')}
        >
          <Text style={styles.languageText}>👨‍🌾 Dholuo</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderInputScreen = () => (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>🌱 Fahamu Shamba</Text>
        <Text style={styles.subtitle}>{t.tagline}</Text>
      </View>

      <View style={styles.content}>
        {/* Sub-County Selection */}
        <Text style={styles.label}>{t.subCounty}</Text>
        <View style={styles.optionsContainer}>
          {subCounties.map((county) => (
            <TouchableOpacity
              key={county.id}
              style={[
                styles.optionButton,
                selectedSubCounty === county.id && styles.optionButtonSelected
              ]}
              onPress={() => setSelectedSubCounty(county.id as SubCounty)}
            >
              <Text style={[
                styles.optionText,
                selectedSubCounty === county.id && styles.optionTextSelected
              ]}>
                {county.name[selectedLanguage]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Soil Type Selection */}
        <Text style={styles.label}>{t.soilType}</Text>
        <View style={styles.optionsContainer}>
          {soilTypes.map((soil) => (
            <TouchableOpacity
              key={soil.id}
              style={[
                styles.optionButton,
                selectedSoilType === soil.id && styles.optionButtonSelected
              ]}
              onPress={() => setSelectedSoilType(soil.id as SoilType)}
            >
              <Text style={[
                styles.optionText,
                selectedSoilType === soil.id && styles.optionTextSelected
              ]}>
                {soil.name[selectedLanguage]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Season Selection */}
        <Text style={styles.label}>{t.season}</Text>
        <View style={styles.optionsContainer}>
          {seasons.map((season) => (
            <TouchableOpacity
              key={season.id}
              style={[
                styles.optionButton,
                selectedSeason === season.id && styles.optionButtonSelected
              ]}
              onPress={() => setSelectedSeason(season.id as Season)}
            >
              <Text style={[
                styles.optionText,
                selectedSeason === season.id && styles.optionTextSelected
              ]}>
                {season.name[selectedLanguage]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Predict Button */}
        <TouchableOpacity 
          style={[
            styles.predictButton,
            (!selectedSubCounty || !selectedSoilType || !selectedSeason) && styles.predictButtonDisabled
          ]}
          onPress={handlePredict}
          disabled={!selectedSubCounty || !selectedSoilType || !selectedSeason || loading}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="white" />
              <Text style={styles.predictButtonText}>{t.loading}</Text>
            </View>
          ) : (
            <Text style={styles.predictButtonText}>🌾 {t.predict}</Text>
          )}
        </TouchableOpacity>

        {/* USSD Info */}
        <View style={styles.ussdInfo}>
          <Text style={styles.ussdTitle}>📞 No Smartphone?</Text>
          <Text style={styles.ussdText}>Dial: *384*86#</Text>
          <Text style={styles.ussdSubtext}>Available in all 3 languages</Text>
        </View>
      </View>
    </ScrollView>
  );

  const renderResultScreen = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🎯 {t.recommendation}</Text>
      </View>

      <View style={styles.resultContainer}>
        <View style={styles.cropCard}>
          <Text style={styles.cropName}>{prediction?.crop?.toUpperCase()}</Text>
          <View style={styles.confidenceBadge}>
            <Text style={styles.confidenceText}>
              {t.confidence}: {prediction?.confidence}%
            </Text>
          </View>
        </View>

        <View style={styles.reasonCard}>
          <Text style={styles.reasonTitle}>{t.reason}:</Text>
          <Text style={styles.reasonText}>{prediction?.reason}</Text>
        </View>

        <View style={styles.feedbackSection}>
          <Text style={styles.feedbackTitle}>{t.feedback}</Text>
          <View style={styles.feedbackButtons}>
            <TouchableOpacity 
              style={[styles.feedbackButton, styles.yesButton]}
              onPress={() => handleFeedback(true)}
            >
              <Text style={styles.feedbackButtonText}>👍 {t.yes}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.feedbackButton, styles.noButton]}
              onPress={() => handleFeedback(false)}
            >
              <Text style={styles.feedbackButtonText}>👎 {t.no}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.backButton}
          onPress={resetForm}
        >
          <Text style={styles.backButtonText}>↻ {t.tryAgain}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.appContainer}>
      <StatusBar backgroundColor="#2E8B57" barStyle="light-content" />
      {currentScreen === 'language' && renderLanguageScreen()}
      {currentScreen === 'input' && renderInputScreen()}
      {currentScreen === 'result' && renderResultScreen()}
    </View>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: '#2E8B57',
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    opacity: 0.9,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#2E8B57',
    textAlign: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  languageButton: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    marginVertical: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  languageText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2E8B57',
    textAlign: 'center',
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
    marginTop: 10,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  optionButton: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginVertical: 5,
    minWidth: '48%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  optionButtonSelected: {
    backgroundColor: '#2E8B57',
    borderColor: '#2E8B57',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    textAlign: 'center',
  },
  optionTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  predictButton: {
    backgroundColor: '#2E8B57',
    padding: 18,
    borderRadius: 15,
    marginTop: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  predictButtonDisabled: {
    backgroundColor: '#ccc',
    elevation: 0,
  },
  predictButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ussdInfo: {
    backgroundColor: '#E8F5E8',
    padding: 15,
    borderRadius: 12,
    marginTop: 30,
    borderLeftWidth: 4,
    borderLeftColor: '#2E8B57',
  },
  ussdTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E8B57',
    marginBottom: 5,
  },
  ussdText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  ussdSubtext: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  resultContainer: {
    flex: 1,
    padding: 20,
  },
  cropCard: {
    backgroundColor: 'white',
    padding: 25,
    borderRadius: 20,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    marginBottom: 20,
  },
  cropName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2E8B57',
    marginBottom: 10,
  },
  confidenceBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 20,
  },
  confidenceText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  reasonCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    marginBottom: 20,
  },
  reasonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  reasonText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  feedbackSection: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    marginBottom: 20,
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  feedbackButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  feedbackButton: {
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
    minWidth: 100,
  },
  yesButton: {
    backgroundColor: '#4CAF50',
  },
  noButton: {
    backgroundColor: '#F44336',
  },
  feedbackButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#666',
    padding: 15,
    borderRadius: 12,
  },
  backButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
});