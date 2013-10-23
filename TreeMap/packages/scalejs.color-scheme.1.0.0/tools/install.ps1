param($installPath, $toolsPath, $package, $project)

$project |
	Add-Paths "{
		'scalejs.color-scheme' : 'Scripts/scalejs.color-scheme-$($package.Version)',
		'color-scheme': 'Scripts/color-scheme.min'
	}" |
	Add-Shims "{
		'color-scheme': {
			exports: 'ColorScheme'
		}
	}" |
	Add-ScalejsExtension 'scalejs.color-scheme' |
	Out-Null