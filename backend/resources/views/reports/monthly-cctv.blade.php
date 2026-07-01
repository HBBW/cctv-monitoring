<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 8px; color: #111827; }
        h1 { font-size: 18px; margin: 0 0 6px; }
        p { margin: 0 0 12px; color: #4b5563; }
        h2 { font-size: 13px; margin: 16px 0 6px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #d1d5db; padding: 3px; text-align: center; }
        th { background: #f3f4f6; }
        td.meta { text-align: left; white-space: nowrap; }
        .unchecked { background: #f8fafc; color: #475569; }
        .checked { background: #ecfdf5; color: #065f46; }
        .issue { background: #fee2e2; color: #991b1b; }
        .resolved { background: #dbeafe; color: #1e40af; }
    </style>
</head>
<body>
    <h1>Laporan Bulanan Monitoring CCTV</h1>
    <p>Bulan: {{ $matrix['month'] }} | 0 berarti belum dicek sama sekali pada tanggal tersebut, OK berarti ada pengecekan normal.</p>
    <table>
        <thead>
            <tr>
                <th>CCTV</th>
                <th>Lokasi</th>
                @for ($day = 1; $day <= $matrix['days_in_month']; $day++)
                    <th>{{ $day }}</th>
                @endfor
            </tr>
        </thead>
        <tbody>
            @foreach ($matrix['rows'] as $row)
                <tr>
                    <td class="meta">{{ $row['name'] }}</td>
                    <td class="meta">{{ $row['location_point'] }}</td>
                    @foreach ($row['days'] as $day)
                        <td class="{{ $day['status'] }}">
                            @if ($day['issue_count'] > 0)
                                {{ $day['issue_count'].' issue' }}
                            @elseif ($day['checked_count'] > 0)
                                OK
                            @else
                                0
                            @endif
                        </td>
                    @endforeach
                </tr>
            @endforeach
        </tbody>
    </table>

    <h2>Ringkasan Issue Bulanan</h2>
    <table>
        <thead>
            <tr>
                <th>Tipe</th>
                <th>Total</th>
                <th>Terbuka</th>
                <th>Selesai</th>
                <th>Hari Terdampak</th>
                <th>CCTV Terdampak</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($matrix['issue_summary'] as $summary)
                <tr>
                    <td>{{ $summary['issue_label'] }}</td>
                    <td>{{ $summary['total'] }}</td>
                    <td>{{ $summary['open'] }}</td>
                    <td>{{ $summary['resolved'] }}</td>
                    <td>{{ $summary['days_count'] }}</td>
                    <td class="meta">{{ $summary['cctv_names'] ?: '-' }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="6">Tidak ada issue pada bulan ini.</td>
                </tr>
            @endforelse
        </tbody>
    </table>
</body>
</html>
