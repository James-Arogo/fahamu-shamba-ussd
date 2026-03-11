/**
 * Community Service for Fahamu Shamba (PostgreSQL/Async Compatible)
 * Provides farmer-to-farmer Q&A, discussion boards, and success stories
 */

let dbAsync;

// Set async database helper (for PostgreSQL)
export function setAsyncDb(asyncDbHelper) {
  dbAsync = asyncDbHelper;
}

// Initialize community tables (already done in migration)
export function initializeCommunityDatabase(dbConnection, asyncDbConnection) {
  if (asyncDbConnection) {
    setAsyncDb(asyncDbConnection);
  }
  console.log('✅ Community async service initialized');
}

// ==================== QUESTIONS & ANSWERS ====================

// Ask a question
export async function askQuestion(data) {
  const { title, content, authorPhone, authorName, subCounty, category } = data;
  
  const result = await dbAsync.run(
    `INSERT INTO community_questions (title, content, author_phone, author_name, sub_county, category)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [title, content, authorPhone, authorName || 'Anonymous', subCounty, category || 'general']
  );
  
  return {
    success: true,
    questionId: result.lastID,
    message: 'Question posted successfully'
  };
}

// Get all questions with pagination
export async function getQuestions(options = {}) {
  const { page = 1, limit = 20, subCounty, category, status } = options;
  const offset = (page - 1) * limit;
  
  let query = 'SELECT * FROM community_questions WHERE 1=1';
  const params = [];
  
  if (subCounty) {
    query += ' AND sub_county = ?';
    params.push(subCounty);
  }
  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  
  const questions = await dbAsync.all(query, params);
  
  // Get total count
  let countQuery = 'SELECT COUNT(*) as total FROM community_questions WHERE 1=1';
  const countParams = [];
  if (subCounty) {
    countQuery += ' AND sub_county = ?';
    countParams.push(subCounty);
  }
  if (category) {
    countQuery += ' AND category = ?';
    countParams.push(category);
  }
  if (status) {
    countQuery += ' AND status = ?';
    countParams.push(status);
  }
  
  const countResult = await dbAsync.get(countQuery, countParams);
  const total = countResult?.total || 0;
  
  // Get answer counts for each question
  const questionsWithAnswers = await Promise.all(questions.map(async (q) => {
    const answerCount = await dbAsync.get('SELECT COUNT(*) as count FROM community_answers WHERE question_id = ?', [q.id]);
    return { ...q, answerCount: answerCount?.count || 0 };
  }));
  
  return {
    success: true,
    data: questionsWithAnswers,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
}

// Get single question with answers
export async function getQuestionWithAnswers(questionId) {
  // Increment views
  await dbAsync.run('UPDATE community_questions SET views = views + 1 WHERE id = ?', [questionId]);
  
  const question = await dbAsync.get('SELECT * FROM community_questions WHERE id = ?', [questionId]);
  
  if (!question) {
    return { success: false, error: 'Question not found' };
  }
  
  const answers = await dbAsync.all(
    `SELECT * FROM community_answers 
     WHERE question_id = ? 
     ORDER BY is_verified DESC, upvotes DESC, created_at ASC`,
    [questionId]
  );
  
  return {
    success: true,
    question,
    answers
  };
}

// Answer a question
export async function answerQuestion(data) {
  const { questionId, content, authorPhone, authorName } = data;
  
  // Check if question exists
  const question = await dbAsync.get('SELECT * FROM community_questions WHERE id = ?', [questionId]);
  if (!question) {
    return { success: false, error: 'Question not found' };
  }
  
  const result = await dbAsync.run(
    `INSERT INTO community_answers (question_id, content, author_phone, author_name)
     VALUES (?, ?, ?, ?)`,
    [questionId, content, authorPhone, authorName || 'Anonymous']
  );
  
  // Update question status if first answer
  const answerCount = await dbAsync.get('SELECT COUNT(*) as count FROM community_answers WHERE question_id = ?', [questionId]);
  if (answerCount.count === 1) {
    await dbAsync.run("UPDATE community_questions SET status = 'answered' WHERE id = ?", [questionId]);
  }
  
  return {
    success: true,
    answerId: result.lastID,
    message: 'Answer posted successfully'
  };
}

// Upvote a question or answer
export async function upvoteContent(type, id) {
  const table = type === 'question' ? 'community_questions' : 'community_answers';
  const column = 'upvotes';
  
  await dbAsync.run(`UPDATE ${table} SET ${column} = ${column} + 1 WHERE id = ?`, [id]);
  
  return { success: true, message: 'Upvote recorded' };
}

// Mark answer as verified
export async function verifyAnswer(answerId) {
  await dbAsync.run('UPDATE community_answers SET is_verified = 1 WHERE id = ?', [answerId]);
  
  return { success: true, message: 'Answer verified' };
}

// ==================== SUCCESS STORIES ====================

// Submit success story
export async function submitSuccessStory(data) {
  const { title, content, authorPhone, authorName, subCounty, cropGrown, yieldAchieved, imageUrl } = data;
  
  const result = await dbAsync.run(
    `INSERT INTO success_stories (title, content, author_phone, author_name, sub_county, crop_grown, yield_achieved, image_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, content, authorPhone, authorName || 'Anonymous', subCounty, cropGrown, yieldAchieved, imageUrl]
  );
  
  return {
    success: true,
    storyId: result.lastID,
    message: 'Success story submitted for review'
  };
}

// Get approved success stories
export async function getSuccessStories(options = {}) {
  const { page = 1, limit = 10, subCounty } = options;
  const offset = (page - 1) * limit;
  
  let query = "SELECT * FROM success_stories WHERE status IN ('approved', 'pending')";
  const params = [];
  
  if (subCounty) {
    query += ' AND sub_county = ?';
    params.push(subCounty);
  }
  
  query += ' ORDER BY likes DESC, created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  
  const stories = await dbAsync.all(query, params);
  
  return {
    success: true,
    data: stories
  };
}

// Approve success story (admin)
export async function approveSuccessStory(storyId) {
  await dbAsync.run(
    `UPDATE success_stories 
     SET status = 'approved', approved_at = CURRENT_TIMESTAMP 
     WHERE id = ?`,
    [storyId]
  );
  
  return { success: true, message: 'Story approved' };
}

// Like a success story
export async function likeSuccessStory(storyId) {
  await dbAsync.run('UPDATE success_stories SET likes = likes + 1 WHERE id = ?', [storyId]);
  return { success: true, message: 'Like recorded' };
}

// ==================== DISCUSSION BOARDS ====================

// Create discussion topic
export async function createDiscussionTopic(data) {
  const { title, description, category, createdBy } = data;
  
  const result = await dbAsync.run(
    `INSERT INTO discussion_topics (title, description, category, created_by)
     VALUES (?, ?, ?, ?)`,
    [title, description, category, createdBy]
  );
  
  return {
    success: true,
    topicId: result.lastID,
    message: 'Topic created'
  };
}

// Get discussion topics
export async function getDiscussionTopics(category) {
  let query = 'SELECT * FROM discussion_topics';
  const params = [];
  
  if (category) {
    query += ' WHERE category = ?';
    params.push(category);
  }
  
  query += ' ORDER BY is_pinned DESC, last_activity DESC';
  
  const topics = await dbAsync.all(query, params);
  
  return {
    success: true,
    topics
  };
}

// Get posts in a topic
export async function getTopicPosts(topicId) {
  const topic = await dbAsync.get('SELECT * FROM discussion_topics WHERE id = ?', [topicId]);
  
  if (!topic) {
    return { success: false, error: 'Topic not found' };
  }
  
  const posts = await dbAsync.all(
    `SELECT * FROM discussion_posts 
     WHERE topic_id = ? 
     ORDER BY created_at ASC`,
    [topicId]
  );
  
  return {
    success: true,
    topic,
    posts
  };
}

// Post in discussion
export async function postToDiscussion(data) {
  const { topicId, content, authorPhone, authorName } = data;
  
  // Check if topic exists
  const topic = await dbAsync.get('SELECT * FROM discussion_topics WHERE id = ?', [topicId]);
  if (!topic) {
    return { success: false, error: 'Topic not found' };
  }
  
  const result = await dbAsync.run(
    `INSERT INTO discussion_posts (topic_id, content, author_phone, author_name)
     VALUES (?, ?, ?, ?)`,
    [topicId, content, authorPhone, authorName || 'Anonymous']
  );
  
  // Update topic activity
  await dbAsync.run(
    `UPDATE discussion_topics 
     SET posts_count = posts_count + 1, last_activity = CURRENT_TIMESTAMP 
     WHERE id = ?`,
    [topicId]
  );
  
  return {
    success: true,
    postId: result.lastID,
    message: 'Post added'
  };
}

// Get user's questions (for My Contributions section)
export async function getUserQuestions(userPhone) {
  if (!userPhone) {
    return {
      success: false,
      error: 'User phone number is required'
    };
  }
  
  const questions = await dbAsync.all(
    `SELECT * FROM community_questions 
     WHERE author_phone = ? 
     ORDER BY created_at DESC`,
    [userPhone]
  );
  
  // Get answer counts for each question
  const questionsWithAnswers = await Promise.all(questions.map(async (q) => {
    const answerCount = await dbAsync.get('SELECT COUNT(*) as count FROM community_answers WHERE question_id = ?', [q.id]);
    return { ...q, answerCount: answerCount?.count || 0 };
  }));
  
  return {
    success: true,
    data: questionsWithAnswers
  };
}

// Get user's stories (for My Contributions section)
export async function getUserStories(userPhone) {
  if (!userPhone) {
    return {
      success: false,
      error: 'User phone number is required'
    };
  }
  
  const stories = await dbAsync.all(
    `SELECT * FROM success_stories 
     WHERE author_phone = ? 
     ORDER BY created_at DESC`,
    [userPhone]
  );
  
  return {
    success: true,
    data: stories
  };
}

// ==================== COMMUNITY STATS ====================

export async function getCommunityStats() {
  const questions = await dbAsync.get('SELECT COUNT(*) as count FROM community_questions');
  const answers = await dbAsync.get('SELECT COUNT(*) as count FROM community_answers');
  const stories = await dbAsync.get("SELECT COUNT(*) as count FROM success_stories WHERE status = 'approved'");
  const topics = await dbAsync.get('SELECT COUNT(*) as count FROM discussion_topics');
  
  // Get total members (unique phone numbers)
  const members = await dbAsync.get(`
    SELECT COUNT(DISTINCT phone) as count 
    FROM (
      SELECT author_phone as phone FROM community_questions
      UNION 
      SELECT author_phone as phone FROM success_stories
    ) AS combined
  `);
  
  const recentQuestions = await dbAsync.all(`
    SELECT q.*, q.author_name as author_name 
    FROM community_questions q 
    ORDER BY q.created_at DESC LIMIT 5
  `);
  
  return {
    success: true,
    stats: {
      totalQuestions: questions?.count || 0,
      totalAnswers: answers?.count || 0,
      approvedStories: stories?.count || 0,
      totalTopics: topics?.count || 0,
      totalMembers: members?.count || 0
    },
    recentQuestions
  };
}

export default {
  initializeCommunityDatabase,
  setAsyncDb,
  askQuestion,
  getQuestions,
  getQuestionWithAnswers,
  answerQuestion,
  upvoteContent,
  verifyAnswer,
  submitSuccessStory,
  getSuccessStories,
  approveSuccessStory,
  likeSuccessStory,
  createDiscussionTopic,
  getDiscussionTopics,
  getTopicPosts,
  postToDiscussion,
  getCommunityStats,
  getUserQuestions,
  getUserStories
};
