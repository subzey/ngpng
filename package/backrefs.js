/**
 * Tries to infer some values by matching the {@link template} with itself.
 * ```text
 * ┌─┬─┬─┬─┬─╔═╤═╤═╗─┐
 * │A│B│C│D│x║B│?│D║y│
 * └─┴─┴─┴─┼─╟─┼─┼─╢─┼─┬─┬─┬─┐
 *         │A║B│C│D║x│B│?│D│y│
 *         └─╚═╧═╧═╝─┴─┴─┴─┴─┘
 *            ? = C
 * ```
 */
export function inferFromBackrefs(template, assumption, dataStartOffset = 0) {
    const usedOffsets = new Set();
    const candidates = Array.from(backrefCandidates(template, assumption, dataStartOffset)).sort((a, b) => {
        return (
        // Prefer longer backrefs
        b.length - a.length) || (
        // Prefer shorter distances
        (a.usedOffset - a.referencedOffset) - (b.usedOffset - b.referencedOffset));
    });
    for (const candidate of candidates) {
        console.log(candidate);
        console.log(template.dump(candidate.referencedOffset, candidate.referencedOffset + candidate.length));
        console.log(template.dump(candidate.usedOffset, candidate.usedOffset + candidate.length));
    }
}
function* backrefCandidates(template, assumption, dataStartOffset = 0) {
    debugger;
    const templateMax = template.contents.length - 1;
    for (let stride = template.contents.length - 3; stride > 0; stride--) {
        let length = 0;
        for (let referencedOffset = templateMax - stride, usedOffset = templateMax; referencedOffset >= 0 && usedOffset >= dataStartOffset; referencedOffset--, usedOffset--) {
            if (!template.isMatching(assumption, referencedOffset, usedOffset)) {
                length = 0;
                continue;
            }
            length++;
            for (let reportedLength = length; reportedLength >= 3; reportedLength--) {
                yield { referencedOffset, usedOffset, length: reportedLength };
            }
        }
    }
}
