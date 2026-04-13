(function () {
  'use strict';

  const LEARNING_KEY = 'learningHubData';
  const ENROLL_KEY = 'learningHubEnrollments';
  let itemIndex = {};

  function readLearningStore() {
    const raw = localStorage.getItem(LEARNING_KEY);
    if (!raw) {
      return { posts: [], courses: [] };
    }

    try {
      const parsed = JSON.parse(raw);
      return {
        posts: Array.isArray(parsed.posts) ? parsed.posts : [],
        courses: Array.isArray(parsed.courses) ? parsed.courses : []
      };
    } catch (error) {
      return { posts: [], courses: [] };
    }
  }

  function normalizeText(value) {
    return String(value || '').toLowerCase();
  }

  function normalizeUrl(url) {
    const raw = String(url || '').trim();
    if (!raw) {
      return null;
    }

    if (/^(https?:|mailto:|tel:)/i.test(raw)) {
      return isLikelyUsableUrl(raw) ? raw : null;
    }

    if (raw.startsWith('//')) {
      const protocolUrl = window.location.protocol + raw;
      return isLikelyUsableUrl(protocolUrl) ? protocolUrl : null;
    }

    const withProtocol = 'https://' + raw;
    return isLikelyUsableUrl(withProtocol) ? withProtocol : null;
  }

  function isLikelyUsableUrl(url) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'mailto:' || parsed.protocol === 'tel:') {
        return true;
      }

      if (!(parsed.protocol === 'http:' || parsed.protocol === 'https:')) {
        return false;
      }

      const host = String(parsed.hostname || '').toLowerCase();
      if (!host) {
        return false;
      }

      if (host === 'localhost') {
        return true;
      }

      if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
        return true;
      }

      return host.includes('.');
    } catch (error) {
      return false;
    }
  }

  function sanitizeStoreLinks(store) {
    const next = {
      posts: Array.isArray(store.posts) ? store.posts.map((item) => ({
        ...item,
        link: normalizeUrl(item.link)
      })) : [],
      courses: Array.isArray(store.courses) ? store.courses.map((item) => ({
        ...item,
        enroll_link: normalizeUrl(item.enroll_link)
      })) : []
    };

    return next;
  }

  function getLearnerKey() {
    const rawEmail = localStorage.getItem('userEmail') || localStorage.getItem('rememberedEmail') || 'guest';
    return normalizeText(rawEmail) || 'guest';
  }

  function readEnrollments() {
    const raw = localStorage.getItem(ENROLL_KEY);
    if (!raw) {
      return {};
    }

    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  function writeEnrollments(data) {
    localStorage.setItem(ENROLL_KEY, JSON.stringify(data));
  }

  function isDeadlinePassed(deadline) {
    if (!deadline) {
      return false;
    }
    const target = new Date(deadline + 'T23:59:59').getTime();
    return Number.isFinite(target) ? Date.now() > target : false;
  }

  function seatsLeft(item) {
    if (!item || !item.seats) {
      return null;
    }
    const total = parseInt(item.seats, 10);
    const used = parseInt(item.enrolled_count || 0, 10);
    if (!Number.isFinite(total)) {
      return null;
    }
    return Math.max(total - (Number.isFinite(used) ? used : 0), 0);
  }

  function getEnrollmentStatus(item, enrollments) {
    const learnerKey = getLearnerKey();
    const itemKey = item._kind + ':' + item.id;
    const enrolled = Boolean(enrollments[learnerKey] && enrollments[learnerKey][itemKey]);
    const deadlinePassed = isDeadlinePassed(item.enroll_deadline || item.deadline);
    const left = seatsLeft(item);
    const full = left !== null && left <= 0;

    return {
      itemKey,
      enrolled,
      deadlinePassed,
      full,
      left
    };
  }

  function sortByDateDesc(list) {
    return [...list].sort((a, b) => {
      const aTime = new Date(a.created_at || a.createdAt || 0).getTime();
      const bTime = new Date(b.created_at || b.createdAt || 0).getTime();
      return bTime - aTime;
    });
  }

  function pickCompetitions(posts) {
    const keywords = ['competition', 'contest', 'challenge', 'championship'];
    return sortByDateDesc(posts).filter((item) => {
      if (normalizeText(item.type) === 'competition') {
        return true;
      }
      const text = normalizeText(item.title) + ' ' + normalizeText(item.content) + ' ' + normalizeText(item.type);
      return keywords.some((word) => text.includes(word));
    });
  }

  function pickHackathons(posts) {
    const keywords = ['hackathon', 'hack day', 'code sprint'];
    return sortByDateDesc(posts).filter((item) => {
      if (normalizeText(item.type) === 'hackathon') {
        return true;
      }
      const text = normalizeText(item.title) + ' ' + normalizeText(item.content) + ' ' + normalizeText(item.type);
      return keywords.some((word) => text.includes(word));
    });
  }

  function renderSection(iconClass, title, items, emptyLabel, mapper, enrollments) {
    const content = items.length
      ? items.slice(0, 4).map((item) => mapper(item, enrollments)).join('')
      : '<div class="learning-empty">' + emptyLabel + '</div>';

    return [
      '<div class="learning-section">',
      '  <div class="learning-title"><i class="' + iconClass + '"></i> ' + title + '</div>',
      '  <div class="learning-list">' + content + '</div>',
      '</div>'
    ].join('');
  }

  function mapCourse(course, enrollments) {
    const level = course.level || 'Beginner';
    const category = course.category || 'General';
    const modules = Array.isArray(course.days) ? course.days.length + ' modules' : 'Self-paced';
    const deadline = course.enroll_deadline ? new Date(course.enroll_deadline).toLocaleDateString() : 'No deadline';
    const status = getEnrollmentStatus({ ...course, _kind: 'course' }, enrollments);
    const seatText = status.left === null ? 'Open seats' : (status.left + ' seats left');
    const enrollKey = 'course:' + course.id;
    const action = status.enrolled
      ? '<button class="learning-btn learning-btn-disabled" disabled>Enrolled</button>'
      : status.deadlinePassed
        ? '<button class="learning-btn learning-btn-disabled" disabled>Deadline Over</button>'
        : status.full
          ? '<button class="learning-btn learning-btn-disabled" disabled>Seats Full</button>'
          : '<button class="learning-btn" onclick="window.enrollLearningItemByKey(\'' + enrollKey + '\')">Enroll Course</button>';
    const courseLink = normalizeUrl(course.enroll_link);
    const linkBtn = courseLink
      ? '<a href="' + courseLink + '" target="_blank" class="learning-btn" style="text-decoration:none; display:inline-block;">Open Link</a>'
      : '';

    return [
      '<div class="learning-item">',
      '  <div class="learning-item-name">' + (course.title || 'Untitled Course') + '</div>',
      '  <div class="learning-meta">',
      '    <span class="learning-chip">' + category + '</span>',
      '    <span class="learning-chip">' + level + '</span>',
      '    <span class="learning-chip">' + modules + '</span>',
      '    <span class="learning-chip">Deadline: ' + deadline + '</span>',
      '    <span class="learning-chip">' + seatText + '</span>',
      '  </div>',
      '  <div class="learning-actions">' + action + linkBtn + '</div>',
      '</div>'
    ].join('');
  }

  function mapPost(post, fallbackMeta, enrollments) {
    const source = post.source_name || post.source_email || 'Career Bridge';
    const meta = post.type || fallbackMeta;
    const deadline = post.deadline ? new Date(post.deadline).toLocaleDateString() : 'No deadline';
    const status = getEnrollmentStatus({ ...post, _kind: 'post' }, enrollments);
    const seatText = status.left === null ? 'Open seats' : (status.left + ' seats left');
    const cta = meta === 'hackathon' ? 'Register Hackathon' : 'Register Now';
    const enrollKey = 'post:' + post.id;
    const action = status.enrolled
      ? '<button class="learning-btn learning-btn-disabled" disabled>Registered</button>'
      : status.deadlinePassed
        ? '<button class="learning-btn learning-btn-disabled" disabled>Deadline Over</button>'
        : status.full
          ? '<button class="learning-btn learning-btn-disabled" disabled>Seats Full</button>'
          : '<button class="learning-btn" onclick="window.enrollLearningItemByKey(\'' + enrollKey + '\')">' + cta + '</button>';
    const postLink = normalizeUrl(post.link);
    const linkBtn = postLink
      ? '<a href="' + postLink + '" target="_blank" class="learning-btn" style="text-decoration:none; display:inline-block;">Open Link</a>'
      : '';

    return [
      '<div class="learning-item">',
      '  <div class="learning-item-name">' + (post.title || 'Untitled Opportunity') + '</div>',
      '  <div class="learning-meta">',
      '    <span class="learning-chip">' + String(meta).toUpperCase() + '</span>',
      '    <span class="learning-chip">' + (post.mode || 'Online') + '</span>',
      '    <span class="learning-chip">Deadline: ' + deadline + '</span>',
      '    <span class="learning-chip">' + seatText + '</span>',
      '    <span class="learning-chip">By: ' + source + '</span>',
      '  </div>',
      '  <div class="learning-actions">' + action + linkBtn + '</div>',
      '</div>'
    ].join('');
  }

  window.enrollLearningItem = function enrollLearningItem(kind, id) {
    const store = readLearningStore();
    const list = kind === 'course' ? (store.courses || []) : (store.posts || []);
    const target = list.find((item) => String(item.id) === String(id));

    if (!target) {
      return;
    }

    const enrollments = readEnrollments();
    const learnerKey = getLearnerKey();
    const itemKey = kind + ':' + id;
    enrollments[learnerKey] = enrollments[learnerKey] || {};

    if (enrollments[learnerKey][itemKey]) {
      return;
    }

    const status = getEnrollmentStatus({ ...target, _kind: kind }, enrollments);
    if (status.deadlinePassed || status.full) {
      return;
    }

    enrollments[learnerKey][itemKey] = {
      title: target.title || 'Untitled',
      enrolled_at: new Date().toISOString()
    };
    writeEnrollments(enrollments);

    target.enrolled_count = parseInt(target.enrolled_count || 0, 10) + 1;
    localStorage.setItem(LEARNING_KEY, JSON.stringify(store));

    window.renderLearningOpportunities({ containerId: 'learningHubContainer' });

    const openLink = normalizeUrl(target.enroll_link || target.link);
    if (openLink) {
      window.open(openLink, '_blank');
    }
  };

  window.enrollLearningItemByKey = function enrollLearningItemByKey(key) {
    const raw = String(key || '');
    const sepIndex = raw.indexOf(':');
    if (sepIndex === -1) {
      return;
    }

    const kind = raw.slice(0, sepIndex);
    const id = raw.slice(sepIndex + 1);
    window.enrollLearningItem(kind, id);
  };

  window.renderLearningOpportunities = function renderLearningOpportunities(options) {
    const containerId = (options && options.containerId) || 'learningHubContainer';
    const container = document.getElementById(containerId);

    if (!container) {
      return;
    }

    const store = sanitizeStoreLinks(readLearningStore());
    localStorage.setItem(LEARNING_KEY, JSON.stringify(store));
    const enrollments = readEnrollments();
    const courses = sortByDateDesc(store.courses || []);
    const competitions = pickCompetitions(store.posts || []);
    const hackathons = pickHackathons(store.posts || []);

    itemIndex = {};
    courses.forEach((item) => { itemIndex['course:' + item.id] = item; });
    competitions.forEach((item) => { itemIndex['post:' + item.id] = item; });
    hackathons.forEach((item) => { itemIndex['post:' + item.id] = item; });

    container.innerHTML = [
      renderSection('fas fa-book-open', 'Courses', courses, 'No courses published yet.', mapCourse, enrollments),
      renderSection('fas fa-trophy', 'Competitions', competitions, 'No competitions published yet.', (item, state) => mapPost(item, 'Competition', state), enrollments),
      renderSection('fas fa-laptop-code', 'Hackathons', hackathons, 'No hackathons published yet.', (item, state) => mapPost(item, 'Hackathon', state), enrollments)
    ].join('');
  };
})();
