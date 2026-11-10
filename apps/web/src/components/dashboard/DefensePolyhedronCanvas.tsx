import { useEffect, useRef, useState } from 'react'

interface Vertex3D {
  x: number
  y: number
  z: number
  label?: string
  sublabel?: string
  type?: 'attack' | 'defend' | 'core' | 'intel'
}

interface Edge3D {
  v1: number
  v2: number
  type: 'attack' | 'defend' | 'intel' | 'cage'
}

interface FloatingPill3D {
  x: number
  y: number
  z: number
  label: string
  tag: string
  color: 'attack' | 'defend' | 'cyan' | 'amber'
}

export function DefensePolyhedronCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [activeNode, setActiveNode] = useState<{ label: string; sub: string; type: string } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let isVisible = true

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const getIsDark = () => {
      return (
        document.documentElement.classList.contains('dark') ||
        document.documentElement.getAttribute('data-theme') !== 'light'
      )
    }

    const getTokens = () => {
      const isDark = getIsDark()
      if (isDark) {
        return {
          cageBeam: 'rgba(236, 232, 222, 0.16)',
          cageBeamInner: 'rgba(236, 232, 222, 0.06)',
          cageJoint: '#ECE8DE',
          cageGlow: 'rgba(255, 90, 54, 0.15)',
          edgeAttack: '#FF5A36',
          edgeAttackGlow: 'rgba(255, 90, 54, 0.45)',
          edgeDefend: '#00E5A3',
          edgeDefendGlow: 'rgba(0, 229, 163, 0.4)',
          edgeIntel: '#38BDF8',
          edgeIntelGlow: 'rgba(56, 189, 248, 0.35)',
          edgeNeutral: 'rgba(236, 232, 222, 0.22)',
          faceAttack: 'rgba(255, 90, 54, 0.07)',
          faceDefend: 'rgba(0, 229, 163, 0.07)',
          nodeAttack: '#FF5A36',
          nodeDefend: '#00E5A3',
          nodeIntel: '#38BDF8',
          nodeNeutral: '#ECE8DE',
          textBright: '#ECE8DE',
          textMuted: '#8F8C82',
          hudGrid: 'rgba(236, 232, 222, 0.05)',
          radarRing: 'rgba(236, 232, 222, 0.08)',
          radarSweep: 'rgba(0, 229, 163, 0.12)',
        }
      } else {
        return {
          cageBeam: 'rgba(20, 20, 18, 0.22)',
          cageBeamInner: 'rgba(20, 20, 18, 0.08)',
          cageJoint: '#141412',
          cageGlow: 'rgba(220, 38, 38, 0.12)',
          edgeAttack: '#DC2626',
          edgeAttackGlow: 'rgba(220, 38, 38, 0.35)',
          edgeDefend: '#0D9488',
          edgeDefendGlow: 'rgba(13, 148, 136, 0.35)',
          edgeIntel: '#0284C7',
          edgeIntelGlow: 'rgba(2, 132, 199, 0.3)',
          edgeNeutral: 'rgba(20, 20, 18, 0.25)',
          faceAttack: 'rgba(220, 38, 38, 0.06)',
          faceDefend: 'rgba(13, 148, 136, 0.06)',
          nodeAttack: '#DC2626',
          nodeDefend: '#0D9488',
          nodeIntel: '#0284C7',
          nodeNeutral: '#141412',
          textBright: '#141412',
          textMuted: '#6B7280',
          hudGrid: 'rgba(20, 20, 18, 0.06)',
          radarRing: 'rgba(20, 20, 18, 0.10)',
          radarSweep: 'rgba(13, 148, 136, 0.10)',
        }
      }
    }

    // 1. Outer Volumetric Cage Geometry (Cube 8 vertices)
    const CUBE_R = 1.35
    const cageVertices: Vertex3D[] = [
      { x: -CUBE_R, y: -CUBE_R, z: -CUBE_R },
      { x: CUBE_R, y: -CUBE_R, z: -CUBE_R },
      { x: CUBE_R, y: CUBE_R, z: -CUBE_R },
      { x: -CUBE_R, y: CUBE_R, z: -CUBE_R },
      { x: -CUBE_R, y: -CUBE_R, z: CUBE_R },
      { x: CUBE_R, y: -CUBE_R, z: CUBE_R },
      { x: CUBE_R, y: CUBE_R, z: CUBE_R },
      { x: -CUBE_R, y: CUBE_R, z: CUBE_R },
    ]

    const cageEdges: [number, number][] = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7],
    ]

    // 2. Inner Defense Icosahedron (12 Golden Ratio Vertices)
    const phi = (1 + Math.sqrt(5)) / 2
    const scale = 0.82
    const rawVertices: Vertex3D[] = [
      { x: -1, y: phi, z: 0, label: 'TA0001 INITIAL ACCESS', sublabel: 'Khai thác biên mạng & Phishing', type: 'attack' },
      { x: 1, y: phi, z: 0, label: 'TA0005 STEALTH (v19+)', sublabel: 'Kỹ thuật ẩn mình né tránh AV/EDR', type: 'attack' },
      { x: -1, y: -phi, z: 0, label: 'TA0112 DEF IMPAIRMENT (v19+)', sublabel: 'Làm mù cảm biến & Tắt dịch vụ', type: 'attack' },
      { x: 1, y: -phi, z: 0, label: 'T1059 EXECUTION', sublabel: 'PowerShell, Command & Scripting', type: 'attack' },
      { x: 0, y: -1, z: phi, label: 'DET STRATEGY (v18+)', sublabel: 'Chiến lược phát hiện bản chất', type: 'defend' },
      { x: 0, y: 1, z: phi, label: 'ANALYTIC ENGINE (v18+)', sublabel: 'Bộ quy tắc phân tích tương quan', type: 'defend' },
      { x: 0, y: -1, z: -phi, label: 'DATA COMPONENT (v18+)', sublabel: 'Nguồn Telemetry & Log chuẩn', type: 'defend' },
      { x: 0, y: 1, z: -phi, label: 'AI/LLM GUARD (v20+)', sublabel: 'Chống Prompt Injection & Trộm dữ liệu', type: 'intel' },
      { x: phi, y: 0, z: -1, label: 'C2 EXFILTRATION', sublabel: 'Kênh truyền tin ra ngoài ngụy trang', type: 'attack' },
      { x: phi, y: 0, z: 1, label: 'TELEMETRY CORRELATION', sublabel: 'Ghép nối đa nguồn sự kiện EDR/SIEM', type: 'defend' },
      { x: -phi, y: 0, z: -1, label: 'LATERAL MOVEMENT', sublabel: 'Lan truyền ngang qua Pass-the-Hash', type: 'attack' },
      { x: -phi, y: 0, z: 1, label: 'PERSISTENCE HOOK', sublabel: 'Duy trì truy cập ngầm qua Registry/Task', type: 'attack' },
    ]
    const icoVertices: Vertex3D[] = rawVertices.map((v) => ({ ...v, x: v.x * scale, y: v.y * scale, z: v.z * scale }))

    const icoEdges: Edge3D[] = [
      { v1: 0, v2: 1, type: 'attack' },
      { v1: 0, v2: 5, type: 'defend' },
      { v1: 0, v2: 7, type: 'intel' },
      { v1: 0, v2: 10, type: 'attack' },
      { v1: 0, v2: 11, type: 'attack' },
      { v1: 1, v2: 5, type: 'defend' },
      { v1: 1, v2: 7, type: 'intel' },
      { v1: 1, v2: 8, type: 'attack' },
      { v1: 1, v2: 9, type: 'defend' },
      { v1: 2, v2: 3, type: 'attack' },
      { v1: 2, v2: 4, type: 'defend' },
      { v1: 2, v2: 6, type: 'defend' },
      { v1: 2, v2: 10, type: 'attack' },
      { v1: 2, v2: 11, type: 'attack' },
      { v1: 3, v2: 4, type: 'defend' },
      { v1: 3, v2: 6, type: 'defend' },
      { v1: 3, v2: 8, type: 'attack' },
      { v1: 3, v2: 9, type: 'defend' },
      { v1: 4, v2: 5, type: 'defend' },
      { v1: 4, v2: 9, type: 'defend' },
      { v1: 4, v2: 11, type: 'defend' },
      { v1: 5, v2: 9, type: 'defend' },
      { v1: 5, v2: 11, type: 'defend' },
      { v1: 6, v2: 7, type: 'intel' },
      { v1: 6, v2: 8, type: 'intel' },
      { v1: 6, v2: 10, type: 'defend' },
      { v1: 7, v2: 8, type: 'intel' },
      { v1: 7, v2: 10, type: 'intel' },
      { v1: 8, v2: 9, type: 'defend' },
      { v1: 10, v2: 11, type: 'attack' },
    ]

    // 3. Facets of Icosahedron for subtle 3D volumetric shading
    const icoFaces: [number, number, number, 'attack' | 'defend'][] = [
      [0, 1, 5, 'defend'],
      [0, 5, 11, 'defend'],
      [0, 11, 10, 'attack'],
      [0, 10, 7, 'attack'],
      [0, 7, 1, 'attack'],
      [1, 7, 8, 'attack'],
      [1, 8, 9, 'defend'],
      [1, 9, 5, 'defend'],
      [2, 3, 4, 'attack'],
      [2, 4, 11, 'defend'],
      [2, 11, 10, 'attack'],
      [2, 10, 6, 'attack'],
      [2, 6, 3, 'defend'],
      [3, 6, 8, 'attack'],
      [3, 8, 9, 'defend'],
      [3, 9, 4, 'defend'],
      [4, 5, 9, 'defend'],
      [4, 5, 11, 'defend'],
      [6, 7, 8, 'attack'],
      [6, 7, 10, 'defend'],
    ]

    // 4. Orbiting 3D Pills (inspired by Xizt DevOps floating badges)
    const floatingPills: FloatingPill3D[] = [
      { x: 1.55, y: -0.9, z: 0.8, label: 'STIX 2.1 LIVE', tag: 'OFFICIAL FEED', color: 'attack' },
      { x: -1.6, y: -0.85, z: -0.5, label: '15 TACTICS', tag: 'TA0001–TA0112', color: 'attack' },
      { x: 1.45, y: 1.0, z: -0.7, label: 'DET → AN → DC', tag: 'PIPELINE v18+', color: 'defend' },
      { x: -1.5, y: 0.95, z: 0.9, label: 'AI & LLM GUARD', tag: 'ATT&CK v20+', color: 'cyan' },
      { x: 0.0, y: -1.75, z: 0.4, label: 'ZERO TRUST DEFENSE', tag: 'TELEMETRY', color: 'defend' },
      { x: 0.0, y: 1.75, z: -0.4, label: 'ICS INFRASTRUCTURE', tag: 'CRITICAL ASSETS', color: 'amber' },
    ]

    // 5. Traveling Photon Pulses
    const photons = [
      { edgeIndex: 0, progress: 0.05, speed: 0.008, type: 'attack' as const },
      { edgeIndex: 4, progress: 0.4, speed: 0.010, type: 'attack' as const },
      { edgeIndex: 9, progress: 0.25, speed: 0.007, type: 'attack' as const },
      { edgeIndex: 14, progress: 0.7, speed: 0.009, type: 'defend' as const },
      { edgeIndex: 18, progress: 0.5, speed: 0.008, type: 'defend' as const },
      { edgeIndex: 22, progress: 0.15, speed: 0.011, type: 'intel' as const },
      { edgeIndex: 26, progress: 0.85, speed: 0.006, type: 'intel' as const },
    ]

    // State & Rotation
    let angleX = 0.38
    let angleY = 0.55
    let velX = 0
    let velY = 0.003
    let mouseX = 0
    let mouseY = 0
    let isDragging = false
    let lastDragX = 0
    let lastDragY = 0

    let width = 0
    let height = 0
    let dpr = 1

    const resize = () => {
      if (!canvas || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      width = rect.width
      height = rect.height || 440
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    window.addEventListener('resize', resize)

    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting
    })
    observer.observe(canvas)

    // Interaction Handlers
    const handleMouseMove = (e: MouseEvent) => {
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      mouseX = (e.clientX - cx) / (rect.width / 2)
      mouseY = (e.clientY - cy) / (rect.height / 2)

      if (isDragging) {
        const dx = e.clientX - lastDragX
        const dy = e.clientY - lastDragY
        velY = (dx * 0.006)
        velX = (dy * 0.006)
        angleY += velY
        angleX += velX
        lastDragX = e.clientX
        lastDragY = e.clientY
      }
    }

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true
      lastDragX = e.clientX
      lastDragY = e.clientY
    }

    const handleMouseUp = () => {
      isDragging = false
    }

    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && isDragging) {
        const touch = e.touches[0]
        const dx = touch.clientX - lastDragX
        const dy = touch.clientY - lastDragY
        velY = dx * 0.007
        velX = dy * 0.007
        angleY += velY
        angleX += velX
        lastDragX = touch.clientX
        lastDragY = touch.clientY
      }
    }

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDragging = true
        lastDragX = e.touches[0].clientX
        lastDragY = e.touches[0].clientY
      }
    }

    canvas.addEventListener('touchmove', handleTouchMove, { passive: true })
    canvas.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchend', handleMouseUp)

    // 3D Projection Engine
    const project = (
      v: { x: number; y: number; z: number },
      ax: number,
      ay: number,
      zoom: number,
      cx: number,
      cy: number,
    ) => {
      const cosY = Math.cos(ay)
      const sinY = Math.sin(ay)
      const x1 = v.x * cosY + v.z * sinY
      const z1 = -v.x * sinY + v.z * cosY

      const cosX = Math.cos(ax)
      const sinX = Math.sin(ax)
      const y2 = v.y * cosX - z1 * sinX
      const z2 = v.y * sinX + z1 * cosX

      const cameraDistance = 3.8
      const perspective = cameraDistance / (cameraDistance - z2)
      const px = cx + x1 * zoom * perspective
      const py = cy + y2 * zoom * perspective

      return { x: px, y: py, z: z2, perspective }
    }

    let tick = 0

    const render = () => {
      if (!isVisible) {
        animationFrameId = requestAnimationFrame(render)
        return
      }

      ctx.clearRect(0, 0, width, height)

      const tokens = getTokens()
      const cx = width / 2
      const cy = height / 2
      const baseZoom = Math.min(width, height) * 0.22

      // Physics / Inertial Rotation
      if (!prefersReducedMotion) {
        if (!isDragging) {
          velY *= 0.94
          velX *= 0.94
          if (Math.abs(velY) < 0.0025) velY = 0.0025
          angleY += velY
          angleX += velX
        }
      }
      tick += 1

      // =========================================================================
      // A. CONCENTRIC CYBER RADAR SWEEP & HUD RINGS (like SecureSphere & Xizt)
      // =========================================================================
      ctx.save()
      ctx.lineWidth = 1

      // Outer radar ring
      ctx.strokeStyle = tokens.radarRing
      ctx.beginPath()
      ctx.arc(cx, cy, baseZoom * 1.75, 0, Math.PI * 2)
      ctx.stroke()

      // Middle dashed ring
      ctx.setLineDash([4, 6])
      ctx.beginPath()
      ctx.arc(cx, cy, baseZoom * 1.35, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])

      // Rotating Radar Scanner Sweep
      const radarAngle = (tick * 0.015) % (Math.PI * 2)
      const radarGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, baseZoom * 1.75)
      radarGrad.addColorStop(0, 'transparent')
      radarGrad.addColorStop(1, tokens.radarSweep)
      ctx.fillStyle = radarGrad
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, baseZoom * 1.75, radarAngle, radarAngle + 0.45)
      ctx.closePath()
      ctx.fill()

      // HUD Axis Crosshair Marks
      ctx.strokeStyle = tokens.hudGrid
      ctx.beginPath()
      ctx.moveTo(cx - baseZoom * 1.85, cy)
      ctx.lineTo(cx + baseZoom * 1.85, cy)
      ctx.moveTo(cx, cy - baseZoom * 1.85)
      ctx.lineTo(cx, cy + baseZoom * 1.85)
      ctx.stroke()

      ctx.restore()

      // =========================================================================
      // B. VOLUMETRIC OUTER CUBE (CYBER CAGE) — BEVELED STRUTS & JOINTS
      // =========================================================================
      const projCage = cageVertices.map((v) => project(v, angleX, angleY, baseZoom, cx, cy))

      // 1. Draw Volumetric Cage Double-Beams
      cageEdges.forEach(([i, j]) => {
        const p1 = projCage[i]
        const p2 = projCage[j]
        const avgZ = (p1.z + p2.z) / 2
        const isFront = avgZ > 0

        // Outer glow beam
        ctx.strokeStyle = tokens.cageBeam
        ctx.lineWidth = isFront ? 2.5 : 1.2
        ctx.beginPath()
        ctx.moveTo(p1.x, p1.y)
        ctx.lineTo(p2.x, p2.y)
        ctx.stroke()

        // Inner specular highlight line
        if (isFront) {
          ctx.strokeStyle = tokens.cageBeamInner
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(p1.x, p1.y)
          ctx.lineTo(p2.x, p2.y)
          ctx.stroke()
        }
      })

      // 2. Draw 8 Cage Corner Junction Spheres with Glow
      projCage.forEach((p) => {
        const radius = p.z > 0 ? 5 : 3.5

        // Outer halo
        ctx.fillStyle = tokens.cageGlow
        ctx.beginPath()
        ctx.arc(p.x, p.y, radius * 2, 0, Math.PI * 2)
        ctx.fill()

        // Solid joint sphere
        ctx.fillStyle = tokens.cageJoint
        ctx.beginPath()
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
        ctx.fill()

        // Corner bracket marker '+'
        if (p.z > 0) {
          ctx.strokeStyle = tokens.edgeAttack
          ctx.lineWidth = 1.2
          ctx.beginPath()
          ctx.moveTo(p.x - 4, p.y)
          ctx.lineTo(p.x + 4, p.y)
          ctx.moveTo(p.x, p.y - 4)
          ctx.lineTo(p.x, p.y + 4)
          ctx.stroke()
        }
      })

      // =========================================================================
      // C. INNER DEFENSE POLYHEDRON (ICOSAREDHON LATTICE & TRANSLUCENT FACES)
      // =========================================================================
      const projIco = icoVertices.map((v) => project(v, angleX, angleY, baseZoom, cx, cy))

      // 1. Draw Translucent Shaded Facets (Depth order)
      icoFaces.forEach(([i1, i2, i3, fType]) => {
        const p1 = projIco[i1]
        const p2 = projIco[i2]
        const p3 = projIco[i3]

        // Back-face culling using 2D cross product
        const cp = (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x)
        if (cp > 0) {
          ctx.fillStyle = fType === 'attack' ? tokens.faceAttack : tokens.faceDefend
          ctx.beginPath()
          ctx.moveTo(p1.x, p1.y)
          ctx.lineTo(p2.x, p2.y)
          ctx.lineTo(p3.x, p3.y)
          ctx.closePath()
          ctx.fill()
        }
      })

      // 2. Sort Edges by Z-depth
      const sortedEdges = icoEdges
        .map((edge) => {
          const p1 = projIco[edge.v1]
          const p2 = projIco[edge.v2]
          const avgZ = (p1.z + p2.z) / 2
          return { edge, p1, p2, avgZ }
        })
        .sort((a, b) => a.avgZ - b.avgZ)

      // 3. Draw Icosahedron Edges with Glow
      sortedEdges.forEach(({ edge, p1, p2, avgZ }) => {
        const isNear = avgZ > 0
        let stroke = tokens.edgeNeutral
        let glow = 'transparent'
        let width = isNear ? 1.6 : 0.9

        if (edge.type === 'attack') {
          stroke = tokens.edgeAttack
          glow = tokens.edgeAttackGlow
          width = isNear ? 2.2 : 1.2
        } else if (edge.type === 'defend') {
          stroke = tokens.edgeDefend
          glow = tokens.edgeDefendGlow
          width = isNear ? 2.2 : 1.2
        } else if (edge.type === 'intel') {
          stroke = tokens.edgeIntel
          glow = tokens.edgeIntelGlow
          width = isNear ? 2.0 : 1.0
        }

        // Draw soft glow under front edges
        if (isNear && glow !== 'transparent') {
          ctx.strokeStyle = glow
          ctx.lineWidth = width * 2.5
          ctx.beginPath()
          ctx.moveTo(p1.x, p1.y)
          ctx.lineTo(p2.x, p2.y)
          ctx.stroke()
        }

        // Crisp edge core
        ctx.strokeStyle = stroke
        ctx.lineWidth = width
        ctx.beginPath()
        ctx.moveTo(p1.x, p1.y)
        ctx.lineTo(p2.x, p2.y)
        ctx.stroke()
      })

      // 4. Draw Traveling Photons along edges
      photons.forEach((photon) => {
        if (!prefersReducedMotion) {
          photon.progress = (photon.progress + photon.speed) % 1
        }
        const edge = icoEdges[photon.edgeIndex]
        const p1 = projIco[edge.v1]
        const p2 = projIco[edge.v2]

        const px = p1.x + (p2.x - p1.x) * photon.progress
        const py = p1.y + (p2.y - p1.y) * photon.progress
        const color =
          photon.type === 'attack'
            ? tokens.edgeAttack
            : photon.type === 'defend'
              ? tokens.edgeDefend
              : tokens.edgeIntel

        // Photon Glow
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(px, py, 4, 0, Math.PI * 2)
        ctx.fill()

        // Photon White Core
        ctx.fillStyle = '#FFFFFF'
        ctx.beginPath()
        ctx.arc(px, py, 1.8, 0, Math.PI * 2)
        ctx.fill()
      })

      // 5. Draw Tactical Vertices (Nodes)
      const sortedNodes = projIco
        .map((p, idx) => ({ p, v: icoVertices[idx], idx }))
        .sort((a, b) => a.p.z - b.p.z)

      let nearestHover: { label: string; sub: string; type: string } | null = null

      sortedNodes.forEach(({ p, v }) => {
        const isNear = p.z > 0
        const radius = isNear ? 4.5 : 2.8

        let nodeColor = tokens.nodeNeutral
        if (v.type === 'attack') nodeColor = tokens.nodeAttack
        else if (v.type === 'defend') nodeColor = tokens.nodeDefend
        else if (v.type === 'intel') nodeColor = tokens.nodeIntel

        // Outer pulsing ring on front nodes
        if (isNear) {
          ctx.strokeStyle = nodeColor
          ctx.lineWidth = 1.2
          ctx.beginPath()
          ctx.arc(p.x, p.y, radius + 3.5, 0, Math.PI * 2)
          ctx.stroke()
        }

        // Inner solid dot
        ctx.fillStyle = nodeColor
        ctx.beginPath()
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
        ctx.fill()

        // White core dot
        ctx.fillStyle = '#FFFFFF'
        ctx.beginPath()
        ctx.arc(p.x, p.y, radius * 0.45, 0, Math.PI * 2)
        ctx.fill()

        // Hit test for mouse hover
        const dist = Math.hypot(p.x - (cx + mouseX * (width / 2)), p.y - (cy + mouseY * (height / 2)))
        if (dist < 26 && isNear && !nearestHover && v.label) {
          nearestHover = { label: v.label, sub: v.sublabel ?? '', type: v.type ?? 'attack' }
        }

        // Technical Monospace Label for prominent front nodes
        if (p.z > 0.4 && v.label) {
          ctx.font = 'bold 9.5px "IBM Plex Mono", monospace'
          ctx.fillStyle = nodeColor
          ctx.fillText(v.label, p.x + 9, p.y + 3)
        }
      })

      setActiveNode(nearestHover)

      // =========================================================================
      // D. FLOATING 3D CYBER PILLS (like Xizt DevOps AWS/Cloud Badges)
      // =========================================================================
      const isMobile = width < 520
      const activePills = isMobile ? floatingPills.slice(0, 3) : floatingPills

      activePills.forEach((pill) => {
        const p = project(pill, angleX, angleY, baseZoom, cx, cy)

        // Only draw when in front to avoid clutter
        if (p.z > (isMobile ? -0.2 : -0.6)) {
          const alpha = Math.min(Math.max((p.z + 0.6) / 1.6, 0.4), 1.0)
          ctx.save()
          ctx.globalAlpha = alpha

          const pillColor =
            pill.color === 'attack'
              ? tokens.edgeAttack
              : pill.color === 'defend'
                ? tokens.edgeDefend
                : pill.color === 'cyan'
                  ? tokens.edgeIntel
                  : '#F59E0B'

          const textWidth = ctx.measureText(pill.label).width
          const boxWidth = isMobile ? Math.max(textWidth + 20, 80) : Math.max(textWidth + 28, 96)
          const boxHeight = isMobile ? 18 : 22
          const bx = p.x - boxWidth / 2
          const by = p.y - boxHeight / 2

          // Background pill
          ctx.fillStyle = getIsDark() ? 'rgba(10, 12, 11, 0.88)' : 'rgba(255, 255, 255, 0.92)'
          ctx.strokeStyle = pillColor
          ctx.lineWidth = 1.2
          ctx.beginPath()
          ctx.roundRect(bx, by, boxWidth, boxHeight, 3)
          ctx.fill()
          ctx.stroke()

          // Status dot
          ctx.fillStyle = pillColor
          ctx.beginPath()
          ctx.arc(bx + (isMobile ? 6 : 8), by + boxHeight / 2, isMobile ? 2 : 2.5, 0, Math.PI * 2)
          ctx.fill()

          // Label
          ctx.font = isMobile ? 'bold 8px "IBM Plex Mono", monospace' : 'bold 9px "IBM Plex Mono", monospace'
          ctx.fillStyle = tokens.textBright
          ctx.fillText(pill.label, bx + (isMobile ? 12 : 15), by + (isMobile ? 12 : 14))

          ctx.restore()
        }
      })

      // Central Breathing Core (Zero-Trust Anchor)
      const corePulse = 3.5 + Math.sin(tick * 0.08) * 2.0
      ctx.fillStyle = tokens.nodeDefend
      ctx.beginPath()
      ctx.arc(cx, cy, corePulse, 0, Math.PI * 2)
      ctx.fill()

      animationFrameId = requestAnimationFrame(render)
    }

    animationFrameId = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
      canvas.removeEventListener('touchmove', handleTouchMove)
      canvas.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchend', handleMouseUp)
      observer.disconnect()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[400px] sm:h-[460px] lg:h-[500px] border-2 border-line bg-surface rounded-xs overflow-hidden flex items-center justify-center select-none shadow-md transition-colors"
    >
      {/* 4 Architectural Drafting Registration Marks */}
      <div className="hidden sm:block absolute top-2.5 left-3 font-mono text-[9px] text-bone-500 uppercase tracking-widest pointer-events-none">
        ┌ MISSION // ATT&amp;CK-3D-CORE
      </div>
      <div className="absolute top-2.5 right-3 font-mono text-[9px] text-bone-500 uppercase tracking-widest pointer-events-none">
        GRID: 15-TAC ┐
      </div>
      <div className="hidden sm:block absolute bottom-2.5 left-3 font-mono text-[9px] text-bone-500 uppercase tracking-widest pointer-events-none">
        └ CORE: VOLUMETRIC DEFENSE LATTICE
      </div>
      <div className="hidden sm:block absolute bottom-2.5 right-3 font-mono text-[9px] text-bone-500 uppercase tracking-widest pointer-events-none">
        LIVE STIX 2.1 ┘
      </div>

      {/* Floating Tactical Status Chips (Top Left / Right) */}
      <div className="absolute top-8 left-4 z-10 flex flex-col gap-1.5 pointer-events-none">
        <span className="font-mono text-[10px] uppercase font-bold text-attack px-2.5 py-1 border border-attack/50 bg-surface/90 rounded-xs backdrop-blur-md inline-flex items-center gap-1.5 w-fit shadow-sm">
          <span className="h-2 w-2 rounded-full bg-attack animate-ping" />
          <span>ADVERSARY VECTOR</span>
        </span>
        <span className="font-mono text-[9px] text-bone-400 px-2 py-0.5 border border-line bg-surface/80 rounded-xs backdrop-blur-md w-fit">
          15 TACTICS · T1000+
        </span>
      </div>

      <div className="absolute top-8 right-4 z-10 flex flex-col items-end gap-1.5 pointer-events-none">
        <span className="font-mono text-[10px] uppercase font-bold text-defend px-2.5 py-1 border border-defend/50 bg-surface/90 rounded-xs backdrop-blur-md inline-flex items-center gap-1.5 w-fit shadow-sm">
          <span className="h-2 w-2 rounded-full bg-defend" />
          <span>DETECTION SPHERE</span>
        </span>
        <span className="font-mono text-[9px] text-bone-400 px-2 py-0.5 border border-line bg-surface/80 rounded-xs backdrop-blur-md w-fit">
          DET → AN → DC
        </span>
      </div>

      {/* Interactive Active Node HUD Card (When hovering a node) */}
      {activeNode && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 px-4 py-2 font-mono text-xs text-bone-100 border-2 border-attack bg-surface/95 rounded-xs shadow-2xl backdrop-blur-md pointer-events-none flex flex-col items-center gap-0.5 min-w-[240px]">
          <div className="flex items-center gap-2 font-bold text-attack text-xs">
            <span>❖</span>
            <span>{activeNode.label}</span>
          </div>
          <div className="text-[10px] text-bone-300 font-sans text-center">
            {activeNode.sub}
          </div>
        </div>
      )}

      {/* Hint to interact */}
      <div className="hidden sm:block absolute bottom-3 left-1/2 -translate-x-1/2 font-mono text-[9px] text-bone-500 uppercase tracking-widest pointer-events-none opacity-70">
        [ KÉO ĐỂ XOAY 3D · DI CHUỘT ĐỂ KHÁM PHÁ MẠNG LƯỚI ]
      </div>
      <div className="sm:hidden absolute bottom-2 left-1/2 -translate-x-1/2 font-mono text-[8px] text-bone-500 uppercase tracking-wider pointer-events-none opacity-60">
        [ CHẠM &amp; VUỐT ĐỂ XOAY 3D ]
      </div>

      {/* Canvas Element */}
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing block"
        aria-label="Khối đa diện bảo mật không gian 3D tương tác thể hiện ma trận ATT&CK"
      />
    </div>
  )
}
