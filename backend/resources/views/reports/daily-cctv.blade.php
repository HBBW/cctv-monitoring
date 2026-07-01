<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 8px; color: #111827; }
        h1 { font-size: 18px; margin: 0 0 6px; }
        p { margin: 0 0 12px; color: #4b5563; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #d1d5db; padding: 3px; text-align: center; }
        th { background: #f3f4f6; }
        td.meta { text-align: left; white-space: nowrap; }
        .normal { background: #ecfdf5; color: #065f46; }
        .issue { background: #fee2e2; color: #991b1b; }
        .resolved { background: #dbeafe; color: #1e40af; }
    </style>
</head>
<body>
    <h1>Laporan Harian Monitoring CCTV</h1>
    <p>Tanggal: {{ $matrix['date'] }} | 0 berarti belum dicek, OK berarti sudah dicek normal dengan bukti foto.</p>
    <table>
        <thead>
            <tr>
                <th>CCTV</th>
                <th>Lokasi</th>
                @for ($hour = 0; $hour < 24; $hour++)
                    <th>{{ $hour }}</th>
                @endfor
            </tr>
        </thead>
        <tbody>
            @foreach ($matrix['rows'] as $row)
                <tr>
                    <td class="meta">{{ $row['name'] }}</td>
                    <td class="meta">{{ $row['location_point'] }}</td>
                    @foreach ($row['hours'] as $hour)
                        <td class="{{ $hour['status'] }}">
                            @if ($hour['status'] === 'unchecked')
                                0
                            @elseif ($hour['status'] === 'checked')
                                OK
                            @elseif ($hour['status'] === 'resolved')
                                {{ $hour['issue_label'] }} selesai
                            @else
                                {{ $hour['issue_label'] }}
                            @endif
                        </td>
                    @endforeach
                </tr>
            @endforeach
        </tbody>
    </table>
</body>
</html>
