// Memastikan fungsi terdaftar secara global di window
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

    // Model Data Proyek Aktif
    activeProject: {
      id: null,
      slug: '',
      type: 'anniversary',
      theme: 'vintage_scrapbook', // 'vintage_scrapbook', 'dark', 'pastel', 'kartun'
      title: '',
      startDate: new Date().toISOString().split('T')[0],
      audioUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3',
      photos: [],
      message: '',
      status: 'draft',
      isPublic: false,
      userId: null
    },

    projects: [],

    initSupabase() {
      try {
        if (window.supabase) {
          const SUPABASE_URL = 'https://ztmhdeownjvzgtzpdlwv.supabase.co';
          const SUPABASE_ANON_KEY = 'sb_publishable_ZDReMFXmZPQxvKGQlu2NfQ_dWqpdrMt';
          this.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        } else {
          console.warn('Supabase SDK tidak terdeteksi.');
        }
      } catch (e) {
        console.error('Inisialisasi Supabase gagal:', e);
      }
    },

    async initApp() {
      this.initSupabase();

      try {
        if (this.supabaseClient) {
          const { data } = await this.supabaseClient.auth.getUser();
          if (data && data.user) {
            this.currentUser = data.user;
          }
        }

        const urlParams = new URLSearchParams(window.location.search);
        const slugParam = urlParams.get('slug');

        if (slugParam && this.supabaseClient) {
          this.isLoading = true;
          const { data, error } = await this.supabaseClient
            .from('projects')
            .select('*')
            .eq('slug', slugParam)
            .single();

          if (data && !error) {
            this.activeProject = {
              id: data.id,
              slug: data.slug,
              type: data.type,
              theme: data.theme || 'vintage_scrapbook',
              title: data.title,
              startDate: data.start_date,
              audioUrl: data.audio_url,
              photos: data.photos || [],
              message: data.message,
              status: data.status,
              isPublic: data.is_public ?? false,
              userId: data.user_id
            };
            this.viewMode = 'public';
            setTimeout(() => this.triggerConfetti(), 800);
          } else {
            alert('Ucapan tidak ditemukan atau link salah!');
            this.viewMode = 'dashboard';
            await this.fetchProjects();
          }
          this.isLoading = false;
        } else {
          await this.fetchProjects();
        }
      } catch (err) {
        console.error('Error saat initApp:', err);
        this.isLoading = false;
      }
    },

    async switchTab(tabName) {
      this.activeTab = tabName;
      await this.fetchProjects();
    },

    async fetchProjects() {
      if (!this.supabaseClient) return;

      this.isLoading = true;
      try {
        let query = this.supabaseClient
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

        const { data, error } = await query;

        if (!error && data) {
          this.projects = data.map(p => ({
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
            isPublic: p.is_public ?? false,
            userId: p.user_id
          }));
        }
      } catch (err) {
        console.error('Gagal mengambil data proyek:', err);
      }
      this.isLoading = false;
    },

    showToast(message) {
      this.toastMessage = message;
      this.copiedToast = true;
      setTimeout(() => { this.copiedToast = false; }, 3000);
    },

    createNewProject(type = 'anniversary') {
      this.activeProject = {
        id: 'project-' + Date.now(),
        slug: 'ucapan-' + Date.now().toString().slice(-6),
        type: type,
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

    editProject(project) {
      this.activeProject = JSON.parse(JSON.stringify(project));
      this.viewMode = 'editor';
    },

    async saveProject(status) {
      if (!this.supabaseClient) {
        alert('Database tidak terhubung. Coba muat ulang halaman.');
        return;
      }

      this.activeProject.status = status;
      this.isLoading = true;

      const payload = {
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

      const { error } = await this.supabaseClient
        .from('projects')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        alert('Gagal menyimpan ke database: ' + error.message);
      } else {
        this.showToast('Ucapan berhasil disimpan! ☁️');
        await this.fetchProjects();
        this.viewMode = 'dashboard';
      }
      this.isLoading = false;
    },

    async deleteProject(id) {
      if (!this.supabaseClient) return;

      if (confirm('Apakah Anda yakin ingin menghapus ucapan ini?')) {
        this.isLoading = true;
        const { error } = await this.supabaseClient
          .from('projects')
          .delete()
          .eq('id', id);

        if (error) {
          alert('Gagal menghapus: ' + error.message);
        } else {
          this.showToast('Ucapan berhasil dihapus.');
          await this.fetchProjects();
        }
        this.isLoading = false;
      }
    },

    openPreview(project) {
      this.activeProject = JSON.parse(JSON.stringify(project));
      this.isPreviewFromEditor = (this.viewMode === 'editor');
      this.viewMode = 'public';
      this.activePhotoIndex = 0;
      setTimeout(() => this.triggerConfetti(), 500);
    },

    goBackFromPreview() {
      const audioEl = document.getElementById('bgAudio');
      if (audioEl) audioEl.pause();
      this.isAudioPlaying = false;

      if (window.location.search.includes('slug')) {
        window.history.pushState({}, document.title, window.location.pathname);
      }

      this.viewMode = this.isPreviewFromEditor ? 'editor' : 'dashboard';
      this.isPreviewFromEditor = false;
    },

    async copyShareLink(project = null) {
      const targetProject = project || this.activeProject;
      if (!targetProject || !targetProject.slug) return;

      const shareUrl = `${window.location.origin}${window.location.pathname}?slug=${targetProject.slug}`;

      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(shareUrl);
          this.showToast('Link ucapan disalin ke clipboard! 📋');
          return;
        } catch (err) {
          console.warn('Fallback clipboard...', err);
        }
      }

      prompt('Salin link ucapan berikut:', shareUrl);
    },

    addPhoto() {
      this.activeProject.photos.push('https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&q=80&w=800');
    },

    removePhoto(index) {
      if (this.activeProject.photos.length > 1) {
        this.activeProject.photos.splice(index, 1);
      } else {
        alert('Minimal harus ada 1 foto!');
      }
    },

    toggleAudio() {
      const audioEl = document.getElementById('bgAudio');
      if (!audioEl) return;

      if (this.isAudioPlaying) {
        audioEl.pause();
        this.isAudioPlaying = false;
      } else {
        audioEl.play().then(() => {
          this.isAudioPlaying = true;
        }).catch(() => {
          alert('Audio gagal diputar. Periksa URL MP3 Anda.');
        });
      }
    },

    triggerConfetti() {
      if (typeof confetti === 'function') {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      }
    },

    calculateDays(startDateStr) {
      if (!startDateStr) return { years: 0, months: 0, days: 0, totalDays: 0 };
      const start = new Date(startDateStr);
      const today = new Date();

      let years = today.getFullYear() - start.getFullYear();
      let months = today.getMonth() - start.getMonth();
      let days = today.getDate() - start.getDate();

      if (days < 0) {
        months--;
        const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        days += prevMonth.getDate();
      }
      if (months < 0) {
        years--;
        months += 12;
      }

      const diffTime = Math.abs(today - start);
      const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      return {
        years: Math.max(0, years),
        months: Math.max(0, months),
        days: Math.max(0, days),
        totalDays: totalDays
      };
    },

    getBadgeText(type) {
      switch (type) {
        case 'birthday': return 'Birthday Special 🎂';
        case 'valentine': return 'Valentine Moment 🌹';
        default: return 'Anniversary Love ❤️';
      }
    },

    getCounterTitle(type) {
      switch (type) {
        case 'birthday': return 'Usia Saat Ini';
        case 'valentine': return 'Momen Kasih Sayang Bersama';
        default: return 'Telah Bersama Selama';
      }
    },

    formatDate(dateStr) {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    }
  };
};