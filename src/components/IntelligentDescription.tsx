"use client";
import React from 'react';

interface IntelligentDescriptionProps {
    text: string;
    className?: string;
}

const HIGHLIGHT_KEYWORDS = [
    'Dosage', 'Application', 'Benefits', 'Target', 'Caution', 'Warning',
    'Storage', 'Active Ingredient', 'Composition', 'Compatibility',
    'Pre-harvest Interval', 'PHI', 'REI', 'Rate', 'Usage'
];

export default function IntelligentDescription({ text, className = "" }: IntelligentDescriptionProps) {
    if (!text) return null;

    // Split by double newlines or single newlines that look like paragraphs
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);

    const formatText = (content: string) => {
        // Handle bold text **...** or __...__
        let parts: (string | React.ReactNode)[] = [content];

        // Replace bold tags
        const boldRegex = /(\*\*|__)(.*?)\1/g;
        let formattedParts: (string | React.ReactNode)[] = [];

        parts.forEach(part => {
            if (typeof part !== 'string') {
                formattedParts.push(part);
                return;
            }

            let lastIndex = 0;
            let match;
            while ((match = boldRegex.exec(part)) !== null) {
                if (match.index > lastIndex) {
                    formattedParts.push(part.substring(lastIndex, match.index));
                }
                formattedParts.push(<strong key={`${match.index}-bold`} className="font-bold text-gray-900">{match[2]}</strong>);
                lastIndex = boldRegex.lastIndex;
            }
            if (lastIndex < part.length) {
                formattedParts.push(part.substring(lastIndex));
            }
        });

        // Highlight Keywords (Case insensitive but preserve prefix)
        let finalParts: (string | React.ReactNode)[] = [];
        formattedParts.forEach((part, idx) => {
            if (typeof part !== 'string') {
                finalParts.push(part);
                return;
            }

            let subParts: (string | React.ReactNode)[] = [part];

            HIGHLIGHT_KEYWORDS.forEach(keyword => {
                let tempParts: (string | React.ReactNode)[] = [];
                const keywordRegex = new RegExp(`^(${keyword}:?)`, 'i');

                subParts.forEach(sp => {
                    if (typeof sp !== 'string') {
                        tempParts.push(sp);
                        return;
                    }

                    const match = keywordRegex.exec(sp);
                    if (match) {
                        tempParts.push(<span key={keyword} className="inline-block px-1.5 py-0.5 bg-green-50 text-green-700 rounded text-[10px] font-black uppercase tracking-tighter mr-2 mb-1 border border-green-100">{match[1]}</span>);
                        tempParts.push(sp.substring(match[0].length));
                    } else {
                        tempParts.push(sp);
                    }
                });
                subParts = tempParts;
            });
            finalParts.push(...subParts);
        });

        return finalParts;
    };

    const renderParagraph = (p: string, idx: number) => {
        // Detect if it's a list item
        const isListItem = p.match(/^(\s*[•\-\*]|\d+\.)\s+([\s\S]*)/);

        if (isListItem) {
            return (
                <div key={idx} className="flex items-start gap-3 mb-3 pl-2">
                    <span className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-green-500" />
                    <div className="text-gray-600 text-sm leading-relaxed">
                        {formatText(isListItem[2])}
                    </div>
                </div>
            );
        }

        // Detect list blocks within the paragraph (single newlines with bullets)
        const lines = p.split('\n');
        if (lines.length > 1 && lines.some(l => l.trim().match(/^[•\-\*]|\d+\.\s+/))) {
            return (
                <div key={idx} className="space-y-2 mb-4">
                    {lines.map((line, lIdx) => (
                        <div key={lIdx} className="flex items-start gap-3 pl-2">
                            {line.trim().match(/^[•\-\*]|\d+\.\s+/) ? (
                                <>
                                    <span className="mt-1.5 flex-shrink-0 w-1 h-1 rounded-full bg-gray-400" />
                                    <div className="text-gray-600 text-sm leading-relaxed">
                                        {formatText(line.replace(/^[•\-\*\d\.]+/, '').trim())}
                                    </div>
                                </>
                            ) : (
                                <p className="text-gray-600 text-sm leading-relaxed">
                                    {formatText(line)}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            );
        }

        return (
            <p key={idx} className="text-gray-600 text-sm leading-relaxed mb-4">
                {formatText(p)}
            </p>
        );
    };

    return (
        <div className={`intelligent-description ${className}`}>
            {paragraphs.map((p, idx) => renderParagraph(p, idx))}
        </div>
    );
}
