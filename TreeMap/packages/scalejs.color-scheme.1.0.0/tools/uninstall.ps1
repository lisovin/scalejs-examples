param($installPath, $toolsPath, $package, $project)

$project |
	Remove-Paths 'scalejs.color-scheme, color-scheme' |
	Remove-ScalejsExtension 'scalejs.color-scheme' |
	Remove-Shims 'color-scheme' |
	Out-Null
