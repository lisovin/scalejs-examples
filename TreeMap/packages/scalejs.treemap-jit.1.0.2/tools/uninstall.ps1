param($installPath, $toolsPath, $package, $project)

$project |
	Remove-Paths 'scalejs.treemap-jit, jit' |
	Remove-ScalejsExtension 'scalejs.treemap-jit' |
	Remove-Shims 'jit'
	Out-Null
