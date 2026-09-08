// ==================== CONFIG SUPABASE ====================
const SUPABASE_URL = 'https://ztmhdeownjvzgtzpdlwv.supabase.co'; // Masukkan Project URL
const SUPABASE_ANON_KEY = 'sb_publishable_ZDReMFXmZPQxvKGQlu2NfQ_dWqpdrMt'; // Masukkan anon / public Key

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function dearyouApp() {
  return {
    viewMode: 'dashboard', // Modes: 'dashboard', 'editor', 'public'
    showOnboarding: false,
    isPreviewFromEditor: false,
    isAudioPlaying: false,
    activePhotoIndex: 0,
    copiedToast: false,
    toastMessage: '',
    isLoading: false,

    // Model Data Proyek Aktif
    activeProject: {
      id: null,
      slug: '',
      type: 'anniversary',
      theme: 'vintage_scrapbook',
      title: '',
      startDate: new Date().toISOString().split('T')[0],
      audioUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3',
      photos: [],
      message: '',
      status: 'draft'
    },

    // Array Penyimpan List Proyek
    projects: [],

    // Initializer Aplikasi saat web pertama dibuka
    async initApp() {
      const urlParams = new URLSearchParams(window.location.search);
      const slugParam = urlParams.get('slug');

      // Jika URL memiliki parameter ?slug=..., ini adalah Tampilan Publik Si B
      if (slugParam) {
        this.isLoading = true;
        const { data, error } = await supabaseClient
          .from('projects')
          .select('*')
          .eq('slug', slugParam)
          .single();

        if (data && !error) {
          this.activeProject = {
            id: data.id,
            slug: data.slug,
            type: data.type,
            theme: data.theme,
            title: data.title,
            startDate: data.start_date,
            audioUrl: data.audio_url,
            photos: data.photos || [],
            message: data.message,
            status: data.status
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
        // Jika tidak ada slug, muat semua proyek untuk Dashboard Si A
        await this.fetchProjects();
      }
    },

    // Ambil Semua Proyek dari Supabase Database
    async fetchProjects() {
      this.isLoading = true;
      const { data, error } = await supabaseClient
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        this.projects = data.map(p => ({
          id: p.id,
          slug: p.slug,
          type: p.type,
          theme: p.theme,
          title: p.title,
          startDate: p.start_date,
          audioUrl: p.audio_url,
          photos: p.photos || [],
          message: p.message,
          status: p.status
        }));
      }
      this.isLoading = false;
    },

    showToast(message) {
      this.toastMessage = message;
      this.copiedToast = true;
      setTimeout(() => { this.copiedToast = false; }, 3000);
    },

    createNewProject(type = 'anniversary') {
      const newId = 'project-' + Date.now();
      this.activeProject = {
        id: newId,
        slug: 'ucapan-' + Date.now().toString().slice(-6),
        type: type,
        theme: 'vintage_scrapbook',
        title: '',
        startDate: new Date().toISOString().split('T')[0],
        audioUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3',
        photos: ['https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&q=80&w=800'],
        message: '',
        status: 'draft'
      };
      this.viewMode = 'editor';
    },

    editProject(project) {
      this.activeProject = JSON.parse(JSON.stringify(project));
      this.viewMode = 'editor';
    },

    // Simpan Ke Supabase Cloud Database (Upsert)
    async saveProject(status) {
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
        status: status
      };

      const { error } = await supabaseClient
        .from('projects')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        alert('Gagal menyimpan ke database: ' + error.message);
      } else {
        this.showToast('Ucapan berhasil disimpan di Cloud! ☁️');
        await this.fetchProjects();
        this.viewMode = 'dashboard';
      }
      this.isLoading = false;
    },

    // Hapus dari Supabase Database
    async deleteProject(id) {
      if (confirm('Apakah Anda yakin ingin menghapus ucapan ini?')) {
        this.isLoading = true;
        const { error } = await supabaseClient
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

      if (this.isPreviewFromEditor) {
        this.viewMode = 'editor';
      } else {
        this.viewMode = 'dashboard';
      }
      this.isPreviewFromEditor = false;
    },

    // Fungsi Copy Link Anti-Gagal (Multi Fallback)
    async copyShareLink(project = null) {
      const targetProject = project || this.activeProject;

      if (!targetProject || !targetProject.slug) {
        alert('Data ucapan atau slug tidak ditemukan!');
        return;
      }

      const shareUrl = `${window.location.origin}${window.location.pathname}?slug=${targetProject.slug}`;

      // METODE 1: Modern Clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(shareUrl);
          this.showToast('Link ucapan disalin ke clipboard! 📋');
          return;
        } catch (err) {
          console.warn('Clipboard API gagal, mencoba fallback...', err);
        }
      }

      // METODE 2: Fallback Textarea untuk Browser HP / In-App Browser TikTok
      try {
        const textArea = document.createElement("textarea");
        textArea.value = shareUrl;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);

        if (successful) {
          this.showToast('Link ucapan disalin ke clipboard! 📋');
        } else {
          prompt('Salin link ucapan berikut:', shareUrl);
        }
      } catch (err) {
        prompt('Salin link ucapan berikut:', shareUrl);
      }
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
          alert('Gagal memutar audio. Pastikan URL audio valid dan dapat diakses.');
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
}