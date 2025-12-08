"use client";

import { useEffect, useState } from 'react';
import { getWeatherForecast, WeatherForecast } from '@/lib/weather';
import { useAuth } from '@/context/AuthContext';

export default function WeatherWidget() {
    const { user } = useAuth();
    const [forecast, setForecast] = useState<WeatherForecast[]>([]);
    const [loading, setLoading] = useState(true);
    const [userLocation, setUserLocation] = useState("Nairobi");

    useEffect(() => {
        const fetchWeather = async () => {
            const location = user?.county || "Nairobi";
            setUserLocation(location);
            setLoading(true);
            try {
                const data = await getWeatherForecast(location);
                setForecast(data);
            } catch (error) {
                console.error("Failed to load weather", error);
            } finally {
                setLoading(false);
            }
        };

        fetchWeather();
    }, [user]);

    const getWeatherIcon = (condition: string) => {
        switch (condition) {
            case 'Sunny': return '☀️';
            case 'Rainy': return '🌧️';
            case 'Cloudy': return '☁️';
            case 'Stormy': return '⛈️';
            default: return '🌤️';
        }
    };

    return (
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg overflow-hidden relative">
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 rounded-full bg-white/10 blur-xl"></div>
            <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-32 h-32 rounded-full bg-white/10 blur-xl"></div>

            <div className="relative z-10 flex items-center justify-between mb-6">
                <div>
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {userLocation}
                    </h3>
                    <p className="text-blue-100 text-xs">Agri-Weather Forecast</p>
                </div>
                {loading && (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                )}
            </div>

            <div className="relative z-10 grid grid-cols-3 gap-2">
                {forecast.map((day, index) => (
                    <div key={index} className={`flex flex-col items-center p-2 rounded-xl border border-white/10 ${index === 0 ? 'bg-white/20 shadow-sm' : 'bg-white/5'}`}>
                        <span className="text-xs font-bold text-blue-100 mb-1">{day.date}</span>
                        <span className="text-3xl mb-1">{getWeatherIcon(day.condition)}</span>
                        <span className="text-lg font-bold">{day.temp}°</span>
                        <div className="mt-2 w-full text-center">
                            <div className="text-[10px] text-blue-200">Rain</div>
                            <div className="text-xs font-bold">{day.chanceOfRain}%</div>
                        </div>
                    </div>
                ))}
            </div>

            {!loading && forecast.length > 0 && (
                <div className="relative z-10 mt-4 bg-white/90 backdrop-blur-sm rounded-lg p-3">
                    <div className="flex items-start gap-2">
                        <span className="text-blue-600 mt-0.5">💡</span>
                        <p className="text-xs text-blue-900 font-medium leading-relaxed">
                            <span className="font-bold text-blue-700">Tip:</span> {forecast[0].description}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
