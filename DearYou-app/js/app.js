window.dearyouApp = function dearyouApp() {
  return {
    viewMode: 'dashboard', 
    activeTab: 'my_projects', 
    currentUser: null,
    isPreviewFromEditor: false,
    isAudioPlaying: false,
    activePhotoIndex: 0,
    copiedToast: false,
    toastMessage: '',
    isLoading: false,
    supabaseClient: null,

    activeProject: {
      id: null,
      slug: '',
      type: 'anniversary',
      theme: 'vintage_scrapbook',
      title: '',
      startDate: new Date().toISOString().split('T')[0],
      audioUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3',
      photos: ['https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&q=80&w=800'],
      message: '',
      status: 'draft',
      isPublic: false,
      userId: null
    },

    projects: [],

    initSupabase: function() {
      try {
        if (window.supabase && typeof window.supabase.createClient === 'function') {
          var SUPABASE_URL = 'https://ztmhdeownjvzgtzpdlwv.supabase.co';
          var SUPABASE_ANON_KEY = 'sb_publishable_ZDReMFXmZPQxvKGQlu2NfQ_dWqpdrMt';
          this.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        }
      } catch (e) {
        console.error('Supabase error:', e);
      }
    },

    initApp: async function() {
      this.initSupabase();

      try {
        if (this.supabaseClient) {
          var authRes = await this.supabaseClient.auth.getUser();
          if (authRes && authRes.data && authRes.data.user) {
            this.currentUser = authRes.data.user;
          }
        }

        var urlParams = new URLSearchParams(window.location.search);
        var slugParam = urlParams.get('slug');

        if (slugParam && this.supabaseClient) {
          this.isLoading = true;
          var res = await this.supabaseClient
            .from('projects')
            .select('*')
            .eq('slug', slugParam)
            .single();

          if (res.data && !res.error) {
            var data = res.data;
            this.activeProject = {
              id: data.id,
              slug: data.slug,
              type: data.type,
              theme: data.theme || 'vintage_scrapbook',
              title: data.title,
              startDate: data.start_date,
              audioUrl: data.audio_url,
              photos: (data.photos && data.photos.length) ? data.photos : ['https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&q=80&w=800'],
              message: data.message,
              status: data.status,
              isPublic: typeof data.is_public !== 'undefined' ? data.is_public : false,
              userId: data.user_id
            };
            this.viewMode = 'public';
            setTimeout(() => this.triggerConfetti(), 800);
          } else {
            this.viewMode = 'dashboard';
            await this.fetchProjects();
          }
          this.isLoading = false;
        } else {
          await this.fetchProjects();
        }
      } catch (err) {
        console.error('Error initApp:', err);
        this.isLoading = false;
      }
    },

    switchTab: async function(tabName) {
      this.activeTab = tabName;
      await this.fetchProjects();
    },

    fetchProjects: async function() {
      if (!this.supabaseClient) {
        this.projects = [];
        return;
      }

      this.isLoading = true;
      try {
        var query = this.supabaseClient
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false });

        if (this.activeTab === 'my_projects') {
          if (this.currentUser) {
            query = query.eq('user_id', this.currentUser.id);
          } else {
            this.projects = [];
            this.isLoading = false;
            return;
          }
        } else if (this.activeTab === 'global') {
          query = query.eq('is_public', true);
        }

        var res = await query;
        if (!res.error && res.data) {
          this.projects = res.data.map(function(p) {
            return {
              id: p.id,
              slug: p.slug,
              type: p.type,
              theme: p.theme || 'vintage_scrapbook',
              title: p.title,
              startDate: p.start_date,
              audioUrl: p.audio_url,
              photos: p.photos || [],
              message: p.message,
              status: p.status,
              isPublic: typeof p.is_public !== 'undefined' ? p.is_public : false,
              userId: p.user_id
            };
          });
        }
      } catch (err) {
        console.error('Fetch error:', err);
      }
      this.isLoading = false;
    },

    showToast: function(message) {
      this.toastMessage = message;
      this.copiedToast = true;
      setTimeout(() => { this.copiedToast = false; }, 3000);
    },

    createNewProject: function(type) {
      this.activeProject = {
        id: 'project-' + Date.now(),
        slug: 'ucapan-' + Date.now().toString().slice(-6),
        type: type || 'anniversary',
        theme: 'vintage_scrapbook',
        title: '',
        startDate: new Date().toISOString().split('T')[0],
        audioUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3',
        photos: ['https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&q=80&w=800'],
        message: '',
        status: 'draft',
        isPublic: false,
        userId: this.currentUser ? this.currentUser.id : null
      };
      this.viewMode = 'editor';
    },

    editProject: function(project) {
      this.activeProject = JSON.parse(JSON.stringify(project));
      this.viewMode = 'editor';
    },

    saveProject: async function(status) {
      if (!this.supabaseClient) return;

      this.activeProject.status = status;
      this.isLoading = true;

      var payload = {
        id: this.activeProject.id,
        slug: this.activeProject.slug,
        type: this.activeProject.type,
        theme: this.activeProject.theme,
        title: this.activeProject.title,
        start_date: this.activeProject.startDate,
        audio_url: this.activeProject.audioUrl,
        photos: this.activeProject.photos,
        message: this.activeProject.message,
        status: status,
        is_public: this.activeProject.isPublic,
        user_id: this.currentUser ? this.currentUser.id : null
      };

      var res = await this.supabaseClient
        .from('projects')
        .upsert(payload, { onConflict: 'id' });

      if (res.error) {
        alert('Gagal menyimpan: ' + res.error.message);
      } else {
        this.showToast('Ucapan tersimpan! ☁️');
        await this.fetchProjects();
        this.viewMode = 'dashboard';
      }
      this.isLoading = false;
    },

    deleteProject: async function(id) {
      if (!this.supabaseClient) return;

      if (confirm('Yakin ingin menghapus ucapan ini?')) {
        this.isLoading = true;
        var res = await this.supabaseClient.from('projects').delete().eq('id', id);
        if (res.error) {
          alert('Gagal menghapus: ' + res.error.message);
        } else {
          this.showToast('Ucapan berhasil dihapus.');
          await this.fetchProjects();
        }
        this.isLoading = false;
      }
    },

    openPreview: function(project) {
      this.activeProject = JSON.parse(JSON.stringify(project));
      this.isPreviewFromEditor = (this.viewMode === 'editor');
      this.viewMode = 'public';
      this.activePhotoIndex = 0;
      setTimeout(() => this.triggerConfetti(), 500);
    },

    goBackFromPreview: function() {
      var audioEl = document.getElementById('bgAudio');
      if (audioEl) audioEl.pause();
      this.isAudioPlaying = false;

      if (window.location.search.includes('slug')) {
        window.history.pushState({}, document.title, window.location.pathname);
      }

      this.viewMode = this.isPreviewFromEditor ? 'editor' : 'dashboard';
      this.isPreviewFromEditor = false;
    },

    copyShareLink: async function(project) {
      var target = project || this.activeProject;
      if (!target || !target.slug) return;

      var shareUrl = window.location.origin + window.location.pathname + '?slug=' + target.slug;

      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(shareUrl);
          this.showToast('Link ucapan berhasil disalin! 📋');
          return;
        } catch (err) {}
      }
      prompt('Salin link ucapan berikut:', shareUrl);
    },

    addPhoto: function() {
      if (!this.activeProject.photos) this.activeProject.photos = [];
      this.activeProject.photos.push('https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&q=80&w=800');
    },

    removePhoto: function(index) {
      if (this.activeProject.photos.length > 1) {
        this.activeProject.photos.splice(index, 1);
      } else {
        alert('Minimal harus ada 1 foto!');
      }
    },

    toggleAudio: function() {
      var audioEl = document.getElementById('bgAudio');
      if (!audioEl) return;

      if (this.isAudioPlaying) {
        audioEl.pause();
        this.isAudioPlaying = false;
      } else {
        audioEl.play().then(() => {
          this.isAudioPlaying = true;
        }).catch(() => {
          alert('Audio tidak dapat diputar.');
        });
      }
    },

    triggerConfetti: function() {
      if (typeof confetti === 'function') {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      }
    },

    calculateDays: function(startDateStr) {
      if (!startDateStr) return { years: 0, months: 0, days: 0, totalDays: 0 };
      var start = new Date(startDateStr);
      var today = new Date();

      var years = today.getFullYear() - start.getFullYear();
      var months = today.getMonth() - start.getMonth();
      var days = today.getDate() - start.getDate();

      if (days < 0) {
        months--;
        var prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        days += prevMonth.getDate();
      }
      if (months < 0) {
        years--;
        months += 12;
      }

      var diffTime = Math.abs(today - start);
      var totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      return {
        years: Math.max(0, years),
        months: Math.max(0, months),
        days: Math.max(0, days),
        totalDays: totalDays
      };
    },

    getBadgeText: function(type) {
      if (type === 'birthday') return 'Birthday Special 🎂';
      if (type === 'valentine') return 'Valentine Moment 🌹';
      return 'Anniversary Love ❤️';
    },

    getCounterTitle: function(type) {
      if (type === 'birthday') return 'Usia Saat Ini';
      if (type === 'valentine') return 'Momen Kasih Sayang';
      return 'Telah Bersama Selama';
    },

    formatDate: function(dateStr) {
      if (!dateStr) return '';
      var date = new Date(dateStr);
      return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    }
  };
};