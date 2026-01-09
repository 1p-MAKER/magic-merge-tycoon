export class SoundManager {
    private static instance: SoundManager;
    private audioContext: AudioContext | null = null;
    private buffers: Map<string, AudioBuffer> = new Map();
    private isMuted: boolean = false;

    private constructor() {
        // Initialize AudioContext on user interaction usually, but here on load for simplicity (might need resume)
        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            this.audioContext = new AudioContextClass();
        } catch (e) {
            console.error("Web Audio API not supported", e);
        }
    }

    public static getInstance(): SoundManager {
        if (!SoundManager.instance) {
            SoundManager.instance = new SoundManager();
        }
        return SoundManager.instance;
    }

    public async loadSound(name: string, url: string): Promise<void> {
        if (!this.audioContext) return;
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.buffers.set(name, audioBuffer);
        } catch (e) {
            console.error(`Failed to load sound: ${name}`, e);
        }
    }

    // Generate a synthetic "crystal" sound if assets are missing
    public playSyntheticMerge(pitchMultiplier: number = 1.0) {
        if (!this.audioContext || this.isMuted) return;
        if (this.audioContext.state === 'suspended') this.audioContext.resume();

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = 'sine';
        // Base frequency 440Hz -> Scaled by multiplier
        osc.frequency.setValueAtTime(440 * pitchMultiplier, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880 * pitchMultiplier, this.audioContext.currentTime + 0.1);

        gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

        osc.connect(gain);
        gain.connect(this.audioContext.destination);

        osc.start();
        osc.stop(this.audioContext.currentTime + 0.3);
    }

    public playSyntheticPop(pitchMultiplier: number = 1.0) {
        if (!this.audioContext || this.isMuted) return;
        if (this.audioContext.state === 'suspended') this.audioContext.resume();

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300 * pitchMultiplier, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50 * pitchMultiplier, this.audioContext.currentTime + 0.1);

        gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(this.audioContext.destination);

        osc.start();
        osc.stop(this.audioContext.currentTime + 0.1);
    }

    public playSyntheticButton(pitchMultiplier: number = 1.0) {
        if (!this.audioContext || this.isMuted) return;
        if (this.audioContext.state === 'suspended') this.audioContext.resume();

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880 * pitchMultiplier, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440 * pitchMultiplier, this.audioContext.currentTime + 0.05);

        gain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);

        osc.connect(gain);
        gain.connect(this.audioContext.destination);

        osc.start();
        osc.stop(this.audioContext.currentTime + 0.05);
    }

    public playSyntheticShuffle() {
        if (!this.audioContext || this.isMuted) return;
        if (this.audioContext.state === 'suspended') this.audioContext.resume();

        for (let i = 0; i < 3; i++) {
            const time = this.audioContext.currentTime + i * 0.05;
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(200 + i * 100, time);
            osc.frequency.exponentialRampToValueAtTime(100, time + 0.05);

            gain.gain.setValueAtTime(0.1, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

            osc.connect(gain);
            gain.connect(this.audioContext.destination);

            osc.start(time);
            osc.stop(time + 0.05);
        }
    }

    public playSyntheticPurge() {
        if (!this.audioContext || this.isMuted) return;
        if (this.audioContext.state === 'suspended') this.audioContext.resume();

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, this.audioContext.currentTime + 0.2);

        gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);

        osc.connect(gain);
        gain.connect(this.audioContext.destination);

        osc.start();
        osc.stop(this.audioContext.currentTime + 0.2);
    }

    public play(name: string, pitch: number = 1.0) {
        if (!this.audioContext || this.isMuted) return;

        // Fallback to synthetic if not loaded
        if (!this.buffers.has(name)) {
            if (name === 'merge') this.playSyntheticMerge(pitch);
            else if (name === 'pop') this.playSyntheticPop(pitch);
            else if (name === 'button') this.playSyntheticButton(pitch);
            else if (name === 'shuffle') this.playSyntheticShuffle();
            else if (name === 'purge') this.playSyntheticPurge();
            return;
        }

        const source = this.audioContext.createBufferSource();
        source.buffer = this.buffers.get(name)!;
        source.playbackRate.value = pitch;

        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = 0.5;

        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        source.start(0);
    }
}
