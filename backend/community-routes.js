/**
 * Community Routes for Fahamu Shamba
 * API endpoints for Q&A, discussions, and success stories
 */

import express from 'express';
import communityService from './community-service-async.js';

const router = express.Router();

// ==================== QUESTIONS & ANSWERS ====================

// Ask a question
router.post('/community/questions', async (req, res) => {
  try {
    const { title, content, authorPhone, authorName, subCounty, category } = req.body;
    
    if (!title || !content || !authorPhone) {
      return res.status(400).json({
        success: false,
        error: 'Title, content, and authorPhone are required'
      });
    }
    
    const result = await communityService.askQuestion({
      title,
      content,
      authorPhone,
      authorName,
      subCounty,
      category
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error posting question:', error);
    res.status(500).json({ success: false, error: 'Failed to post question' });
  }
});

// Get all questions
router.get('/community/questions', async (req, res) => {
  try {
    const { page, limit, subCounty, category, status } = req.query;
    
    const result = await communityService.getQuestions({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      subCounty,
      category,
      status
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch questions' });
  }
});

// Get user's questions (for My Contributions section)
router.get('/community/my-questions', async (req, res) => {
  try {
    const { phone } = req.query;
    
    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'User phone number is required'
      });
    }
    
    const result = await communityService.getUserQuestions(phone);
    res.json(result);
  } catch (error) {
    console.error('Error fetching user questions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user questions' });
  }
});

// Get user's stories (for My Contributions section)
router.get('/community/my-stories', async (req, res) => {
  try {
    const { phone } = req.query;
    
    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'User phone number is required'
      });
    }
    
    const result = await communityService.getUserStories(phone);
    res.json(result);
  } catch (error) {
    console.error('Error fetching user stories:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user stories' });
  }
});

// Get single question with answers
router.get('/community/questions/:id', async (req, res) => {
  try {
    const result = await communityService.getQuestionWithAnswers(parseInt(req.params.id));
    res.json(result);
  } catch (error) {
    console.error('Error fetching question:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch question' });
  }
});

// Answer a question
router.post('/community/answers', async (req, res) => {
  try {
    const { questionId, content, authorPhone, authorName } = req.body;
    
    if (!questionId || !content || !authorPhone) {
      return res.status(400).json({
        success: false,
        error: 'questionId, content, and authorPhone are required'
      });
    }
    
    const result = await communityService.answerQuestion({
      questionId: parseInt(questionId),
      content,
      authorPhone,
      authorName
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error posting answer:', error);
    res.status(500).json({ success: false, error: 'Failed to post answer' });
  }
});

// Upvote question or answer
router.post('/community/upvote', async (req, res) => {
  try {
    const { type, id } = req.body;
    
    if (!type || !id) {
      return res.status(400).json({
        success: false,
        error: 'type and id are required'
      });
    }
    
    if (!['question', 'answer'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'type must be "question" or "answer"'
      });
    }
    
    const result = await communityService.upvoteContent(type, parseInt(id));
    res.json(result);
  } catch (error) {
    console.error('Error upvoting:', error);
    res.status(500).json({ success: false, error: 'Failed to upvote' });
  }
});

// Verify answer (admin)
router.post('/community/answers/verify', async (req, res) => {
  try {
    const { answerId } = req.body;
    
    if (!answerId) {
      return res.status(400).json({
        success: false,
        error: 'answerId is required'
      });
    }
    
    const result = await communityService.verifyAnswer(parseInt(answerId));
    res.json(result);
  } catch (error) {
    console.error('Error verifying answer:', error);
    res.status(500).json({ success: false, error: 'Failed to verify answer' });
  }
});

// ==================== SUCCESS STORIES ====================

// Submit success story
router.post('/community/stories', async (req, res) => {
  try {
    const { title, content, authorPhone, authorName, subCounty, cropGrown, yieldAchieved, imageUrl } = req.body;
    
    if (!title || !content || !authorPhone) {
      return res.status(400).json({
        success: false,
        error: 'Title, content, and authorPhone are required'
      });
    }
    
    const result = await communityService.submitSuccessStory({
      title,
      content,
      authorPhone,
      authorName,
      subCounty,
      cropGrown,
      yieldAchieved,
      imageUrl
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error submitting story:', error);
    res.status(500).json({ success: false, error: 'Failed to submit story' });
  }
});

// Get success stories
router.get('/community/stories', async (req, res) => {
  try {
    const { page, limit, subCounty } = req.query;
    
    const result = await communityService.getSuccessStories({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      subCounty
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching stories:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stories' });
  }
});

// Like success story
router.post('/community/stories/like', async (req, res) => {
  try {
    const { storyId } = req.body;
    
    if (!storyId) {
      return res.status(400).json({
        success: false,
        error: 'storyId is required'
      });
    }
    
    const result = await communityService.likeSuccessStory(parseInt(storyId));
    res.json(result);
  } catch (error) {
    console.error('Error liking story:', error);
    res.status(500).json({ success: false, error: 'Failed to like story' });
  }
});

// Approve success story (admin)
router.post('/community/stories/approve', async (req, res) => {
  try {
    const { storyId } = req.body;
    
    if (!storyId) {
      return res.status(400).json({
        success: false,
        error: 'storyId is required'
      });
    }
    
    const result = await communityService.approveSuccessStory(parseInt(storyId));
    res.json(result);
  } catch (error) {
    console.error('Error approving story:', error);
    res.status(500).json({ success: false, error: 'Failed to approve story' });
  }
});

// ==================== DISCUSSION BOARDS ====================

// Create discussion topic
router.post('/community/topics', async (req, res) => {
  try {
    const { title, description, category, createdBy } = req.body;
    
    if (!title || !category || !createdBy) {
      return res.status(400).json({
        success: false,
        error: 'title, category, and createdBy are required'
      });
    }
    
    const result = await communityService.createDiscussionTopic({
      title,
      description,
      category,
      createdBy
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error creating topic:', error);
    res.status(500).json({ success: false, error: 'Failed to create topic' });
  }
});

// Get discussion topics
router.get('/community/topics', async (req, res) => {
  try {
    const { category } = req.query;
    const result = await communityService.getDiscussionTopics(category);
    res.json(result);
  } catch (error) {
    console.error('Error fetching topics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch topics' });
  }
});

// Get posts in topic
router.get('/community/topics/:id/posts', async (req, res) => {
  try {
    const result = await communityService.getTopicPosts(parseInt(req.params.id));
    res.json(result);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch posts' });
  }
});

// Post to discussion
router.post('/community/posts', async (req, res) => {
  try {
    const { topicId, content, authorPhone, authorName } = req.body;
    
    if (!topicId || !content || !authorPhone) {
      return res.status(400).json({
        success: false,
        error: 'topicId, content, and authorPhone are required'
      });
    }
    
    const result = await communityService.postToDiscussion({
      topicId: parseInt(topicId),
      content,
      authorPhone,
      authorName
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error posting:', error);
    res.status(500).json({ success: false, error: 'Failed to post' });
  }
});

// ==================== COMMUNITY STATS ====================

// Get community statistics
router.get('/community/stats', async (req, res) => {
  try {
    const result = await communityService.getCommunityStats();
    res.json(result);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

export default router;
