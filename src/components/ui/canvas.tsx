/* eslint-disable @typescript-eslint/no-explicit-any */
// Canvas animation logic with minimal TypeScript fixes

class Oscillator {
    phase: number;
    offset: number;
    frequency: number;
    amplitude: number;

    constructor(options: { phase?: number; offset?: number; frequency?: number; amplitude?: number } = {}) {
        this.phase = options.phase || 0;
        this.offset = options.offset || 0;
        this.frequency = options.frequency || 0.001;
        this.amplitude = options.amplitude || 1;
    }

    update(): number {
        this.phase += this.frequency;
        return this.offset + Math.sin(this.phase) * this.amplitude;
    }
}

class Node {
    x: number = 0;
    y: number = 0;
    vx: number = 0;
    vy: number = 0;
}

class Line {
    spring: number = 0;
    friction: number = 0;
    nodes: Node[] = [];

    constructor(options: { spring: number }) {
        this.spring = options.spring + 0.1 * Math.random() - 0.05;
        this.friction = E.friction + 0.01 * Math.random() - 0.005;
        this.nodes = [];
        for (let i = 0; i < E.size; i++) {
            const t = new Node();
            t.x = pos.x;
            t.y = pos.y;
            this.nodes.push(t);
        }
    }

    update() {
        let spring = this.spring;
        let node = this.nodes[0];

        node.vx += (pos.x - node.x) * spring;
        node.vy += (pos.y - node.y) * spring;

        for (let i = 0; i < this.nodes.length; i++) {
            node = this.nodes[i];
            if (i > 0) {
                const prevNode = this.nodes[i - 1];
                node.vx += (prevNode.x - node.x) * spring;
                node.vy += (prevNode.y - node.y) * spring;
                node.vx += prevNode.vx * E.dampening;
                node.vy += prevNode.vy * E.dampening;
            }
            node.vx *= this.friction;
            node.vy *= this.friction;
            node.x += node.vx;
            node.y += node.vy;
            spring *= E.tension;
        }
    }

    draw() {
        let node = this.nodes[0];
        let x = node.x;
        let y = node.y;

        ctx.beginPath();
        ctx.moveTo(x, y);

        let i;
        for (i = 1; i < this.nodes.length - 2; i++) {
            const currentNode = this.nodes[i];
            const nextNode = this.nodes[i + 1];
            x = 0.5 * (currentNode.x + nextNode.x);
            y = 0.5 * (currentNode.y + nextNode.y);
            ctx.quadraticCurveTo(currentNode.x, currentNode.y, x, y);
        }

        const penultimateNode = this.nodes[i];
        const lastNode = this.nodes[i + 1];
        ctx.quadraticCurveTo(penultimateNode.x, penultimateNode.y, lastNode.x, lastNode.y);
        ctx.stroke();
        ctx.closePath();
    }
}

// Global variables
let ctx: any;
let f: Oscillator;
let lines: Line[] = [];
let pos = { x: 0, y: 0 }; // Initialize with defaults
const E = {
    debug: true,
    friction: 0.5,
    trails: 80,
    size: 50,
    dampening: 0.025,
    tension: 0.99,
};

function onMousemove(e: MouseEvent | TouchEvent) {
    function initLines() {
        lines = [];
        for (let i = 0; i < E.trails; i++) {
            lines.push(new Line({ spring: 0.45 + (i / E.trails) * 0.025 }));
        }
    }

    function updatePos(e: MouseEvent | TouchEvent) {
        if ('touches' in e) {
            pos.x = e.touches[0].pageX;
            pos.y = e.touches[0].pageY;
        } else {
            pos.x = (e as MouseEvent).clientX;
            pos.y = (e as MouseEvent).clientY;
        }
        e.preventDefault();
    }

    function touchStart(e: TouchEvent) {
        if (e.touches.length === 1) {
            pos.x = e.touches[0].pageX;
            pos.y = e.touches[0].pageY;
        }
    }

    document.removeEventListener("mousemove", onMousemove as any);
    document.removeEventListener("touchstart", onMousemove as any);

    document.addEventListener("mousemove", updatePos as any);
    document.addEventListener("touchmove", updatePos as any);
    document.addEventListener("touchstart", touchStart as any);

    updatePos(e);
    initLines();
    render();
}

function render() {
    if (ctx.running) {
        ctx.globalCompositeOperation = "source-over";
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = "hsla(" + Math.round(f.update()) + ",100%,50%,0.025)";
        ctx.lineWidth = 10;

        for (let i = 0; i < E.trails; i++) {
            if (lines[i]) {
                lines[i].update();
                lines[i].draw();
            }
        }

        ctx.frame++;
        window.requestAnimationFrame(render);
    }
}

function resizeCanvas() {
    if (ctx && ctx.canvas) {
        ctx.canvas.width = window.innerWidth - 20;
        ctx.canvas.height = window.innerHeight;
    }
}

export const renderCanvas = function () {
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    if (!canvas) return;

    ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.running = true;
    ctx.frame = 1;

    f = new Oscillator({
        phase: Math.random() * 2 * Math.PI,
        amplitude: 85,
        frequency: 0.0015,
        offset: 285,
    });

    document.addEventListener("mousemove", onMousemove as any);
    document.addEventListener("touchstart", onMousemove as any);
    document.body.addEventListener("orientationchange", resizeCanvas);
    window.addEventListener("resize", resizeCanvas);

    window.addEventListener("focus", () => {
        if (!ctx.running) {
            ctx.running = true;
            render();
        }
    });

    window.addEventListener("blur", () => {
        ctx.running = true;
    });

    resizeCanvas();
};
