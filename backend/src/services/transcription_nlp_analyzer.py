"""
==================================================================================
TRANSCRIPTION NLP ANALYZER - TIER 1: ENHANCED INTELLIGENCE
==================================================================================

PURPOSE:
    This module processes live transcription text files and performs comprehensive
    Natural Language Processing to detect sentiment, intent, and emotional state.
    It then adapts the conversation tone and generates intelligent responses.

FEATURES:
    1. Sentiment Detection: excited, confused, hesitant, neutral, interested
    2. Intent Classification: visa, cost, scholarship, university, course, etc.
    3. Emotional State Recognition: Maps sentiment to student emotional states
    4. Tone Adaptation: Adjusts response tone based on detected emotion
    5. Confidence Scoring: Provides confidence levels for all detections
    6. Multi-language Support: English, Hindi, Marathi

INSTALLATION REQUIREMENTS:
    pip install transformers torch scipy numpy

INPUT:
    - Path to transcription text file (*.txt)
    - Or raw text string from live transcription

OUTPUT:
    TranscriptionAnalysisResult object containing:
    - sentiment: str (excited, confused, hesitant, neutral, interested)
    - emotional_state: str (student's emotional condition)
    - intent: str (user's primary intention)
    - confidence: float (0.0-1.0)
    - detected_keywords: List[str]
    - suggested_tone: str (how agent should respond)
    - response_recommendations: Dict (suggested response strategies)

==================================================================================
"""

import asyncio
import re
import os
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, asdict
from pathlib import Path
from functools import lru_cache
import logging

# NLP and ML Libraries
try:
    from transformers import pipeline
    HAS_TRANSFORMERS = True
except ImportError:
    HAS_TRANSFORMERS = False
    print("⚠️  Warning: transformers not installed. Install with: pip install transformers torch")

logger = logging.getLogger(__name__)

# ==================================================================================
# CONFIGURATION & CONSTANTS
# ==================================================================================

# Sentiment Categories for Educational Context
SENTIMENT_MAP = {
    "positive": "excited",
    "neutral": "neutral",
    "negative": "hesitant"
}

# Context-specific keywords for enhanced emotion detection
EMOTION_KEYWORDS = {
    "excited": [
        "interested", "amazing", "love", "want", "great", "excited", "wow",
        "fantastic", "awesome", "brilliant", "definitely", "sure", "yes"
    ],
    "confused": [
        "confusion", "confuse", "what", "how", "don't understand", "unclear",
        "ambiguous", "lost", "struggling", "don't get", "explain", "complicated"
    ],
    "hesitant": [
        "not sure", "maybe", "worried", "concern", "afraid", "difficult", "hard",
        "unsure", "uncertain", "doubt", "scared", "nervous", "anxious"
    ],
    "interested": [
        "interested", "tell", "explain", "curious", "know more", "ask",
        "information", "help", "learn", "understand"
    ],
    "frustrated": [
        "frustrated", "annoyed", "angry", "irritated", "fed up", "tired",
        "exhausted", "overwhelmed", "stressed"
    ]
}

# Intent patterns for domain-specific queries
INTENT_PATTERNS = {
    "visa_inquiry": [
        "visa", "ukvi", "ihs", "proof", "fund", "व्हिसा", "फंड", "वीज़ा",
        "फीस", "immigration", "passport", "extension"
    ],
    "cost_inquiry": [
        "fee", "fees", "cost", "budget", "rupee", "lakh", "खर्च", "बजट",
        "फीस", "लाख", "kitna", "price", "expensive", "cheap", "paisa", "afford"
    ],
    "scholarship_inquiry": [
        "scholarship", "chevening", "funding", "शिष्यवृत्ती", "स्कॉलरशिप",
        "merit", "bursary", "grant"
    ],
    "ielts_pte_inquiry": [
        "ielts", "pte", "toefl", "band", "स्कोर", "आयल्ट्स", "english test", "score"
    ],
    "university_inquiry": [
        "university", "college", "ranking", "rank", "apply", "admission", "uni",
        "यूनिवर्सिटी", "कॉलेज", "russell group", "oxford", "cambridge"
    ],
    "course_inquiry": [
        "msc", "mba", "course", "program", "data science", "computer science",
        "mtech", "masters", "degree", "btech"
    ],
    "post_study_work": [
        "graduate route", "psw", "post study", "stay back", "work after",
        "remain", "settle", "work visa"
    ],
    "loan_inquiry": [
        "loan", "borrow", "sbi", "hdfc", "prodigy", "mpower", "education loan", "emi"
    ],
    "document_inquiry": [
        "document", "sop", "lor", "transcript", "what do i need", "application",
        "reference letter", "resume", "cv"
    ]
}

# Tone recommendations based on emotional state
TONE_RECOMMENDATIONS = {
    "excited": {
        "tone": "enthusiastic_supportive",
        "pace": "normal",
        "detail_level": "comprehensive",
        "emojis": False,
        "description": "Student is engaged and eager. Provide detailed information with enthusiasm."
    },
    "confused": {
        "tone": "patient_explanatory",
        "pace": "slow",
        "detail_level": "simplified",
        "emojis": False,
        "description": "Student is confused. Break down information into simple, clear steps."
    },
    "hesitant": {
        "tone": "encouraging_reassuring",
        "pace": "moderate",
        "detail_level": "focused",
        "emojis": False,
        "description": "Student is uncertain. Provide reassurance and highlight positive outcomes."
    },
    "interested": {
        "tone": "informative_engaging",
        "pace": "normal",
        "detail_level": "balanced",
        "emojis": False,
        "description": "Student wants to learn. Provide accurate, well-structured information."
    },
    "frustrated": {
        "tone": "empathetic_problem_solving",
        "pace": "slow",
        "detail_level": "focused",
        "emojis": False,
        "description": "Student is frustrated. Acknowledge concerns and focus on solutions."
    },
    "neutral": {
        "tone": "professional_helpful",
        "pace": "normal",
        "detail_level": "standard",
        "emojis": False,
        "description": "Student is neutral. Provide standard professional assistance."
    }
}

# ==================================================================================
# DATA CLASSES
# ==================================================================================

@dataclass
class TranscriptionAnalysisResult:
    """
    Complete analysis result for a transcription.
    
    Attributes:
        text: Original transcription text
        sentiment: Primary sentiment (excited, confused, hesitant, neutral, interested)
        emotional_state: Detailed emotional state description
        intent: Detected primary intent
        confidence: Overall confidence score (0.0-1.0)
        sentiment_confidence: Confidence in sentiment detection
        intent_confidence: Confidence in intent detection
        detected_keywords: Keywords found in text
        emotional_keywords: Specific emotion-related keywords
        suggested_tone: How the agent should respond (tone, pace, detail level)
        response_recommendations: Specific suggestions for response
        language: Detected language (en, hi, mr)
        timestamp: When analysis was performed
        analysis_metadata: Additional metadata
    """
    text: str
    sentiment: str
    emotional_state: str
    intent: str
    confidence: float
    sentiment_confidence: float
    intent_confidence: float
    detected_keywords: List[str]
    emotional_keywords: List[str]
    suggested_tone: Dict[str, Any]
    response_recommendations: Dict[str, Any]
    language: str = "en"
    timestamp: str = None
    analysis_metadata: Dict[str, Any] = None

    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization"""
        return asdict(self)

    def get_summary(self) -> str:
        """Get human-readable summary of analysis"""
        return f"""
        ==== TRANSCRIPTION ANALYSIS SUMMARY ====
        Emotional State: {self.emotional_state}
        Sentiment: {self.sentiment} (confidence: {self.sentiment_confidence:.2%})
        Intent: {self.intent} (confidence: {self.intent_confidence:.2%})
        Suggested Tone: {self.suggested_tone['tone']}
        Overall Confidence: {self.confidence:.2%}
        """


# ==================================================================================
# CORE NLP ANALYZER CLASS
# ==================================================================================

class TranscriptionNLPAnalyzer:
    """
    Main class for analyzing transcriptions using NLP.
    
    Usage:
        analyzer = TranscriptionNLPAnalyzer()
        
        # Analyze from file
        result = asyncio.run(analyzer.analyze_transcription_file('transcription.txt'))
        
        # Analyze from text
        result = asyncio.run(analyzer.analyze_text('Hello, I am confused about visa fees'))
        
        # Get response recommendations
        recommendations = analyzer.get_response_recommendations(result)
    """

    def __init__(self, use_transformers: bool = True):
        """
        Initialize the analyzer with NLP models.
        
        Args:
            use_transformers: Whether to use transformer models (slower but more accurate)
                            If False, uses regex-based pattern matching (fast but less accurate)
        """
        self.use_transformers = use_transformers and HAS_TRANSFORMERS
        self.sentiment_model = None
        self.intent_model = None
        
        if self.use_transformers:
            self._load_transformer_models()
        
        logger.info(f"TranscriptionNLPAnalyzer initialized (transformers: {self.use_transformers})")

    def _load_transformer_models(self):
        """Load transformer models for sentiment and intent analysis"""
        try:
            # Load sentiment analysis model
            self.sentiment_model = pipeline(
                "sentiment-analysis",
                model="distilbert-base-uncased-finetuned-sst-2-english",
                device=-1  # Use CPU
            )
            logger.info("✅ Sentiment model loaded")
        except Exception as e:
            logger.warning(f"⚠️  Failed to load sentiment model: {e}")
            self.use_transformers = False

    # ==================================================================================
    # TEXT PREPROCESSING
    # ==================================================================================

    @staticmethod
    def _normalize_text(text: str) -> str:
        """Normalize text for analysis"""
        if not text:
            return ""
        # Remove extra whitespace
        text = re.sub(r"\s+", " ", text.strip())
        # Convert to lowercase for keyword matching
        return text.lower()

    @staticmethod
    def _detect_language(text: str) -> str:
        """
        Simple language detection based on script detection.
        
        Returns:
            'en': English
            'hi': Hindi
            'mr': Marathi
        """
        # Hindi unicode range: U+0900 to U+097F
        # Marathi is written using Devanagari script (same as Hindi)
        if any('\u0900' <= char <= '\u097F' for char in text):
            return 'hi'  # Hindi/Marathi detected
        return 'en'

    # ==================================================================================
    # SENTIMENT ANALYSIS
    # ==================================================================================

    def _analyze_sentiment_transformer(self, text: str) -> Tuple[str, float]:
        """
        Analyze sentiment using transformer model.
        
        Returns:
            (sentiment, confidence)
        """
        if not self.sentiment_model or not text.strip():
            return "neutral", 0.0

        try:
            result = self.sentiment_model(text[:512])  # Truncate to model max length
            label = result[0]['label'].lower()
            score = result[0]['score']
            
            # Map POSITIVE/NEGATIVE to excitement levels
            if label == 'positive':
                sentiment = 'excited'
            elif label == 'negative':
                sentiment = 'hesitant'
            else:
                sentiment = 'neutral'
            
            return sentiment, score
        except Exception as e:
            logger.error(f"Transformer sentiment analysis error: {e}")
            return "neutral", 0.0

    def _analyze_sentiment_pattern(self, text: str) -> Tuple[str, float]:
        """
        Analyze sentiment using keyword pattern matching.
        Fallback method when transformers not available.
        
        Returns:
            (emotion_state, confidence)
        """
        normalized = self._normalize_text(text)
        emotion_scores = {}
        
        # Count emotion keyword matches
        for emotion, keywords in EMOTION_KEYWORDS.items():
            score = sum(1 for keyword in keywords if keyword in normalized)
            emotion_scores[emotion] = score
        
        # Find dominant emotion
        if not any(emotion_scores.values()):
            return "neutral", 0.5
        
        dominant_emotion = max(emotion_scores, key=emotion_scores.get)
        max_score = emotion_scores[dominant_emotion]
        total_matches = sum(emotion_scores.values())
        
        # Calculate confidence (0.0-1.0)
        confidence = min(1.0, max_score / max(1, total_matches / 2))
        
        return dominant_emotion, confidence

    async def analyze_sentiment(self, text: str) -> Tuple[str, float]:
        """
        Analyze text sentiment asynchronously.
        
        Args:
            text: Text to analyze
            
        Returns:
            (sentiment, confidence)
        """
        if self.use_transformers:
            try:
                # Run in thread pool to avoid blocking
                result = await asyncio.to_thread(self._analyze_sentiment_transformer, text)
                return result
            except Exception as e:
                logger.warning(f"Transformer analysis failed, using pattern matching: {e}")
                return self._analyze_sentiment_pattern(text)
        else:
            return self._analyze_sentiment_pattern(text)

    # ==================================================================================
    # INTENT DETECTION
    # ==================================================================================

    def _classify_intent(self, text: str) -> Tuple[str, float, List[str]]:
        """
        Classify the user's intent based on keyword matching.
        
        Returns:
            (intent, confidence, matched_keywords)
        """
        normalized = self._normalize_text(text)
        intent_scores = {}
        matched_keywords = []
        
        # Score each intent based on keyword matches
        for intent, keywords in INTENT_PATTERNS.items():
            matches = [kw for kw in keywords if kw in normalized]
            if matches:
                intent_scores[intent] = len(matches)
                matched_keywords.extend(matches)
        
        # Determine primary intent
        if not intent_scores:
            return "general_query", 0.5, []
        
        primary_intent = max(intent_scores, key=intent_scores.get)
        confidence = min(1.0, intent_scores[primary_intent] / 3.0)  # Normalize confidence
        
        return primary_intent, confidence, matched_keywords

    # ==================================================================================
    # EMOTION & KEYWORD DETECTION
    # ==================================================================================

    def _detect_emotions(self, text: str) -> Tuple[str, List[str], float]:
        """
        Detect emotional state and extract emotion-related keywords.
        
        Returns:
            (dominant_emotion, emotion_keywords, confidence)
        """
        normalized = self._normalize_text(text)
        emotion_matches = {}
        detected_keywords = []
        
        # Find all emotion keywords
        for emotion, keywords in EMOTION_KEYWORDS.items():
            matches = [kw for kw in keywords if kw in normalized]
            if matches:
                emotion_matches[emotion] = len(matches)
                detected_keywords.extend(matches)
        
        if not emotion_matches:
            return "neutral", [], 0.5
        
        dominant_emotion = max(emotion_matches, key=emotion_matches.get)
        max_matches = emotion_matches[dominant_emotion]
        total_matches = sum(emotion_matches.values())
        confidence = min(1.0, max_matches / max(1, total_matches / 2))
        
        return dominant_emotion, detected_keywords, confidence

    def _extract_context_keywords(self, text: str) -> List[str]:
        """Extract domain-specific keywords from text"""
        normalized = self._normalize_text(text)
        keywords = []
        
        # Extract budget mentions
        budget_pattern = r'(?:₹|rs\.?|rupees?)\s?[\d,]+(?:\.\d+)?|\b\d+\s?(?:lakh|lakhs|lac|lacs|crore|crores)\b'
        budget_matches = re.findall(budget_pattern, text, re.IGNORECASE)
        keywords.extend(budget_matches)
        
        # Extract test scores
        score_pattern = r'\b(?:ielts|pte|toefl)\s*[\d.]+\b'
        score_matches = re.findall(score_pattern, text, re.IGNORECASE)
        keywords.extend(score_matches)
        
        # Extract intent keywords
        for intent_keywords in INTENT_PATTERNS.values():
            for kw in intent_keywords:
                if kw in normalized:
                    keywords.append(kw)
        
        return list(set(keywords))  # Remove duplicates

    # ==================================================================================
    # MAIN ANALYSIS METHODS
    # ==================================================================================

    async def analyze_text(self, text: str) -> TranscriptionAnalysisResult:
        """
        Comprehensive analysis of transcription text.
        
        Args:
            text: Transcription text to analyze
            
        Returns:
            TranscriptionAnalysisResult object
        """
        if not text or not text.strip():
            raise ValueError("Empty text provided for analysis")
        
        # Detect language
        language = self._detect_language(text)
        
        # Parallel analysis tasks
        sentiment_task = self.analyze_sentiment(text)
        intent_result = self._classify_intent(text)
        emotion_result = self._detect_emotions(text)
        keywords = self._extract_context_keywords(text)
        
        # Await concurrent sentiment analysis
        sentiment, sentiment_confidence = await sentiment_task
        intent, intent_confidence, intent_keywords = intent_result
        emotional_state, emotion_keywords, emotion_confidence = emotion_result
        
        # Calculate overall confidence
        overall_confidence = (sentiment_confidence + intent_confidence + emotion_confidence) / 3.0
        
        # Get tone recommendations
        tone_rec = TONE_RECOMMENDATIONS.get(emotional_state, TONE_RECOMMENDATIONS["neutral"])
        
        # Generate response recommendations
        response_rec = self._generate_response_recommendations(
            sentiment, emotional_state, intent, text
        )
        
        result = TranscriptionAnalysisResult(
            text=text,
            sentiment=sentiment,
            emotional_state=emotional_state,
            intent=intent,
            confidence=overall_confidence,
            sentiment_confidence=sentiment_confidence,
            intent_confidence=intent_confidence,
            detected_keywords=keywords,
            emotional_keywords=emotion_keywords,
            suggested_tone=tone_rec,
            response_recommendations=response_rec,
            language=language,
            timestamp=self._get_timestamp(),
            analysis_metadata={
                "intent_keywords": intent_keywords,
                "analysis_method": "transformer" if self.use_transformers else "pattern",
                "text_length": len(text),
                "language": language
            }
        )
        
        return result

    async def analyze_transcription_file(self, file_path: str) -> TranscriptionAnalysisResult:
        """
        Analyze a transcription from a text file.
        
        Args:
            file_path: Path to transcription text file
            
        Returns:
            TranscriptionAnalysisResult object
            
        Raises:
            FileNotFoundError: If file doesn't exist
            IOError: If file cannot be read
        """
        try:
            file_path_obj = Path(file_path)
            if not file_path_obj.exists():
                raise FileNotFoundError(f"Transcription file not found: {file_path}")
            
            with open(file_path_obj, 'r', encoding='utf-8') as f:
                text = f.read()
            
            logger.info(f"Loaded transcription from {file_path}")
            return await self.analyze_text(text)
        
        except FileNotFoundError as e:
            logger.error(f"File error: {e}")
            raise
        except Exception as e:
            logger.error(f"Error reading transcription file: {e}")
            raise IOError(f"Failed to read transcription file: {e}")

    # ==================================================================================
    # RESPONSE GENERATION & RECOMMENDATIONS
    # ==================================================================================

    def _generate_response_recommendations(
        self,
        sentiment: str,
        emotional_state: str,
        intent: str,
        text: str
    ) -> Dict[str, Any]:
        """
        Generate specific recommendations for how to respond to this sentiment/intent.
        
        Returns:
            Dictionary with response strategy recommendations
        """
        recommendations = {
            "primary_strategy": self._get_strategy_for_state(emotional_state),
            "adapt_language_for": emotional_state,
            "focus_on": self._get_focus_areas(intent),
            "avoid": self._get_avoid_topics(emotional_state),
            "communication_tips": self._get_communication_tips(emotional_state),
            "follow_up_questions": self._get_follow_up_questions(intent, emotional_state)
        }
        
        return recommendations

    @staticmethod
    def _get_strategy_for_state(emotional_state: str) -> str:
        """Get primary communication strategy for emotional state"""
        strategies = {
            "excited": "Maintain momentum with detailed, comprehensive information",
            "confused": "Simplify and break down into smaller, digestible parts",
            "hesitant": "Provide reassurance and highlight positive outcomes",
            "interested": "Engage with balanced, well-structured information",
            "frustrated": "Acknowledge concerns and focus on practical solutions",
            "neutral": "Provide professional, straightforward assistance"
        }
        return strategies.get(emotional_state, strategies["neutral"])

    @staticmethod
    def _get_focus_areas(intent: str) -> List[str]:
        """Get specific areas to focus on based on intent"""
        focus_map = {
            "visa_inquiry": ["visa requirements", "fees", "processing timeline", "documentation"],
            "cost_inquiry": ["total cost breakdown", "currency conversion", "hidden costs", "payment options"],
            "scholarship_inquiry": ["eligibility criteria", "application process", "award amounts"],
            "ielts_pte_inquiry": ["exam format", "preparation tips", "test dates", "score validity"],
            "university_inquiry": ["university rankings", "program quality", "city location", "campus facilities"],
            "course_inquiry": ["curriculum", "industry relevance", "career prospects", "course duration"],
            "post_study_work": ["work visa duration", "salary expectations", "job market"],
            "loan_inquiry": ["interest rates", "repayment terms", "eligibility criteria", "processing time"],
            "document_inquiry": ["required documents", "preparation guide", "timeline", "common mistakes"]
        }
        return focus_map.get(intent, ["general information"])

    @staticmethod
    def _get_avoid_topics(emotional_state: str) -> List[str]:
        """Get topics to avoid for specific emotional states"""
        avoid_map = {
            "confused": ["Complex jargon", "Too many options at once", "Technical details"],
            "hesitant": ["Negative outcomes", "Worst-case scenarios", "Making them feel pressured"],
            "frustrated": ["Dismissive language", "Repeating information", "Going off-topic"],
            "excited": [],  # Excited students can handle more
            "interested": [],
            "neutral": []
        }
        return avoid_map.get(emotional_state, [])

    @staticmethod
    def _get_communication_tips(emotional_state: str) -> List[str]:
        """Get specific communication tips for emotional state"""
        tips_map = {
            "excited": [
                "✓ Use enthusiastic tone",
                "✓ Provide comprehensive details",
                "✓ Encourage further questions",
                "✓ Share success stories"
            ],
            "confused": [
                "✓ Use simple, clear language",
                "✓ Break down complex topics",
                "✓ Use examples and analogies",
                "✓ Summarize frequently"
            ],
            "hesitant": [
                "✓ Acknowledge concerns",
                "✓ Provide reassurance",
                "✓ Offer step-by-step guidance",
                "✓ Share success stories of similar students"
            ],
            "interested": [
                "✓ Provide accurate, detailed information",
                "✓ Share relevant resources",
                "✓ Encourage exploration",
                "✓ Answer all questions thoroughly"
            ],
            "frustrated": [
                "✓ Acknowledge frustration",
                "✓ Show empathy",
                "✓ Offer practical solutions",
                "✓ Take ownership of resolution"
            ],
            "neutral": [
                "✓ Provide professional assistance",
                "✓ Be clear and concise",
                "✓ Focus on facts",
                "✓ Offer next steps"
            ]
        }
        return tips_map.get(emotional_state, tips_map["neutral"])

    @staticmethod
    def _get_follow_up_questions(intent: str, emotional_state: str) -> List[str]:
        """Get suggested follow-up questions based on intent and emotional state"""
        base_questions = {
            "visa_inquiry": [
                "What is your current financial situation?",
                "Do you have any visa application experience?",
                "When are you planning to apply?"
            ],
            "cost_inquiry": [
                "What's your budget range?",
                "Are you looking for scholarships?",
                "Do you need information about education loans?"
            ],
            "scholarship_inquiry": [
                "What are your academic achievements?",
                "Are you interested in specific universities?",
                "What's your work experience?"
            ],
            "ielts_pte_inquiry": [
                "When do you plan to take the test?",
                "Have you taken it before?",
                "What score are you targeting?"
            ],
            "university_inquiry": [
                "What subject area interests you?",
                "What's your preferred location?",
                "What's your budget range?"
            ],
            "course_inquiry": [
                "What's your academic background?",
                "What career goal are you targeting?",
                "When do you want to start?"
            ]
        }
        
        questions = base_questions.get(intent, [])
        
        # Adjust questions based on emotional state
        if emotional_state == "confused":
            # Add simpler, more direct questions
            questions = questions[:2] if len(questions) > 2 else questions
        elif emotional_state == "hesitant":
            # Add reassuring follow-ups
            questions.append("What concerns do you have?")
        
        return questions

    # ==================================================================================
    # UTILITY METHODS
    # ==================================================================================

    @staticmethod
    def _get_timestamp() -> str:
        """Get current timestamp"""
        from datetime import datetime
        return datetime.now().isoformat()

    def get_response_recommendations(self, result: TranscriptionAnalysisResult) -> Dict[str, Any]:
        """
        Get detailed response recommendations from analysis result.
        
        Args:
            result: TranscriptionAnalysisResult object
            
        Returns:
            Detailed recommendation dictionary
        """
        recommendations = result.response_recommendations
        recommendations["summary"] = f"""
        The student appears to be {result.emotional_state} about {result.intent}.
        {recommendations['communication_tips'][0]}
        """
        return recommendations


# ==================================================================================
# ASYNC WRAPPER & UTILITY FUNCTIONS
# ==================================================================================

async def analyze_transcription_async(text: str, use_transformers: bool = True) -> TranscriptionAnalysisResult:
    """
    Quick async function to analyze transcription text.
    
    Example:
        result = await analyze_transcription_async("I'm confused about visa fees")
        print(result.get_summary())
    """
    analyzer = TranscriptionNLPAnalyzer(use_transformers=use_transformers)
    return await analyzer.analyze_text(text)


def analyze_transcription_sync(text: str, use_transformers: bool = True) -> TranscriptionAnalysisResult:
    """
    Synchronous wrapper for transcription analysis.
    
    Example:
        result = analyze_transcription_sync("Tell me about scholarships")
        print(result.to_dict())
    """
    analyzer = TranscriptionNLPAnalyzer(use_transformers=use_transformers)
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(analyzer.analyze_text(text))
    finally:
        loop.close()


# ==================================================================================
# EXAMPLE USAGE & TESTING
# ==================================================================================

if __name__ == "__main__":
    """
    Example usage of the TranscriptionNLPAnalyzer
    """
    
    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Example 1: Analyze text directly
    print("\n" + "="*80)
    print("EXAMPLE 1: Direct Text Analysis (Confused Student)")
    print("="*80)
    
    confused_text = """
    Hi, I'm really confused about the visa process. Like, what exactly do I need to do?
    I have a student loan, but I'm not sure if that's enough for the proof of funds.
    How long does the whole visa thing take? And what about the IHS fees?
    I'm also worried about the cost of living in London... is it very expensive?
    """
    
    result = analyze_transcription_sync(confused_text, use_transformers=False)  # Use False for faster demo
    print(result.get_summary())
    print("\nResponse Recommendations:")
    for key, value in result.response_recommendations.items():
        print(f"  {key}: {value}")
    
    # Example 2: Excited student
    print("\n" + "="*80)
    print("EXAMPLE 2: Excited Student Analysis")
    print("="*80)
    
    excited_text = """
    Wow! I'm so excited about studying in the UK! I want to know more about
    scholarships. Are there any merit-based scholarships available for Indian students?
    I have a great GPA and I've done some research work too. What amazing universities
    should I be targeting? I absolutely love the idea of going to Oxford or Cambridge!
    """
    
    result = analyze_transcription_sync(excited_text, use_transformers=False)
    print(result.get_summary())
    
    # Example 3: Hesitant student
    print("\n" + "="*80)
    print("EXAMPLE 3: Hesitant Student Analysis")
    print("="*80)
    
    hesitant_text = """
    I'm not sure if I'm ready for this. Maybe I should wait another year?
    I'm worried about my English. What if I can't score well in IELTS?
    And I'm afraid about the visa rejection. Is it very likely to get rejected?
    I'm also concerned about whether I can afford education loans.
    """
    
    result = analyze_transcription_sync(hesitant_text, use_transformers=False)
    print(result.get_summary())
    
    print("\n" + "="*80)
    print("Analysis complete! Use this analyzer in your voice agent system.")
    print("="*80)
