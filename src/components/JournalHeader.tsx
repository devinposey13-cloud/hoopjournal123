import paperTexture from '@/assets/paper-texture.avif';

interface JournalHeaderProps {
  playerName?: string;
}

export function JournalHeader({ playerName }: JournalHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl mb-8">
      {/* Paper texture background */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-90"
        style={{ backgroundImage: `url(${paperTexture})` }}
      />
      
      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-amber-50/30 to-amber-100/50" />
      
      {/* Content */}
      <div className="relative z-10 px-8 py-10 text-center">
        {/* Dear Basketball in cursive */}
        <h1 
          className="text-4xl md:text-5xl lg:text-6xl mb-2"
          style={{ 
            fontFamily: "'Dancing Script', cursive",
            color: '#2d1810',
            textShadow: '1px 1px 2px rgba(255,255,255,0.5)'
          }}
        >
          Dear Basketball,
        </h1>
        
        {/* Decorative line */}
        <div className="w-32 h-0.5 bg-amber-800/30 mx-auto my-4" />
        
        {/* Subtitle / date line */}
        <p 
          className="text-lg md:text-xl opacity-80"
          style={{ 
            fontFamily: "'Dancing Script', cursive",
            color: '#4a3728'
          }}
        >
          {playerName ? `${playerName}'s Journey` : 'My Basketball Journey'}
        </p>
      </div>
      
      {/* Subtle paper edge shadow */}
      <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-black/10 to-transparent" />
    </div>
  );
}
