"use client"

export function AnimatedBackground() {
  return (
    <>
      <style>{`
        @keyframes orbFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(30px, -40px) scale(1.1); }
          50% { transform: translate(-20px, 20px) scale(0.9); }
          75% { transform: translate(40px, -10px) scale(1.05); }
        }
        @keyframes orbFloat2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(-35px, 30px) scale(0.95); }
          50% { transform: translate(25px, -25px) scale(1.1); }
          75% { transform: translate(-15px, 35px) scale(1.0); }
        }
        @keyframes orbFloat3 {
          0%, 100% { transform: translate(0, 0); }
          33% { transform: translate(20px, 20px); }
          66% { transform: translate(-20px, 10px); }
        }
        @keyframes meshShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .auth-mesh {
          background: radial-gradient(ellipse at 30% 20%, #2a1a3a 0%, #1a1a2e 50%, #0d0d1a 100%);
          background-size: 200% 200%;
          animation: meshShift 15s ease infinite;
        }
        .auth-orb-1 { animation: orbFloat 12s ease-in-out infinite; }
        .auth-orb-2 { animation: orbFloat2 16s ease-in-out infinite; }
        .auth-orb-3 { animation: orbFloat3 10s ease-in-out infinite; }
      `}</style>
    </>
  )
}
